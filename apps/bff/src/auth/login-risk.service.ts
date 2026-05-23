import {
  HttpException,
  HttpStatus,
  Injectable,
  OnModuleDestroy,
  UnauthorizedException
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";
import {
  getErrorLogFields,
  writeStructuredLog
} from "../common/logging/structured-log";

type FailureSubject = {
  ip: string;
  username: string;
};

/**
 * 登录实时风控服务：
 * 1. 登录前检查用户和 IP 是否仍在 Redis 锁定期。
 * 2. 登录失败后同时累加用户维度和 IP 维度的失败次数，并设置失败窗口过期时间。
 * 3. 任一维度达到阈值后写入带 EX 过期时间的锁定 key，并返回 429。
 * 4. 登录成功后清理失败计数和锁定 key，避免历史失败影响正常用户。
 *
 * 实现方式：
 * - 用 Redis string 保存失败计数，key 分成 user 和 ip 两类。
 * - 每次失败用 multi 同时 incr 计数和 expire 计数窗口，减少中间状态不一致。
 * - 达到阈值后写入 lock key，并通过 EX 让 Redis 自动解除锁定。
 * - AuthService 根据这里抛出的 401 或 429 决定记录 failure 还是 blocked 审计。
 *
 * 这里的 Redis 数据只负责“当前是否要拦截”，历史分析依赖 login_audit_logs 和每日统计表。
 */
@Injectable()
export class LoginRiskService implements OnModuleDestroy {
  // Redis 连接异常可能持续触发；这里做日志节流，避免 Redis 挂掉时刷爆控制台。
  private static readonly REDIS_ERROR_LOG_INTERVAL_MS = 30_000;

  private readonly redis: Redis;
  // 失败计数 key 和锁定 key 分开存：失败计数用于滑动窗口判断，锁定 key 用于快速拒绝请求。
  private readonly ipKeyPrefix: string;
  private readonly lockKeyPrefix: string;
  private readonly userKeyPrefix: string;
  private readonly maxFailuresPerIp: number;
  private readonly maxFailuresPerUser: number;
  private readonly failureWindowSeconds: number;
  private readonly lockSeconds: number;
  private lastRedisErrorLogAt = 0;

  constructor(private readonly configService: ConfigService) {
    this.maxFailuresPerIp = this.readPositiveInteger(
      "LOGIN_MAX_FAILURES_PER_IP",
      20
    );
    this.maxFailuresPerUser = this.readPositiveInteger(
      "LOGIN_MAX_FAILURES_PER_USER",
      5
    );
    this.failureWindowSeconds = this.readPositiveInteger(
      "LOGIN_FAILURE_WINDOW_SECONDS",
      900
    );
    this.lockSeconds = this.readPositiveInteger("LOGIN_LOCK_SECONDS", 600);
    this.ipKeyPrefix = this.configService.get<string>(
      "LOGIN_FAILURE_IP_REDIS_KEY_PREFIX",
      "next-bff:login-fail:ip:"
    );
    this.userKeyPrefix = this.configService.get<string>(
      "LOGIN_FAILURE_USER_REDIS_KEY_PREFIX",
      "next-bff:login-fail:user:"
    );
    this.lockKeyPrefix = this.configService.get<string>(
      "LOGIN_LOCK_REDIS_KEY_PREFIX",
      "next-bff:login-lock:"
    );
    this.redis = new Redis(
      this.configService.get<string>("REDIS_URL", "redis://127.0.0.1:6379"),
      {
        enableOfflineQueue: false,
        maxRetriesPerRequest: 1,
        retryStrategy: (times) => Math.min(times * 500, 5_000)
      }
    );
    this.redis.on("error", (error) => {
      this.logRedisError(error);
    });
  }

  async onModuleDestroy() {
    // Nest 应用关闭时断开 Redis，避免测试或进程退出时遗留连接。
    this.redis.disconnect();
  }

  async assertLoginAllowed(subject: FailureSubject) {
    const username = this.normalizeUsername(subject.username);
    const ip = this.normalizeIp(subject.ip);
    // 登录前只检查锁定 key 的 TTL；TTL > 0 表示用户或 IP 仍在锁定期。
    const [userLockTtl, ipLockTtl] = await Promise.all([
      this.redis.ttl(this.getUserLockKey(username)),
      this.redis.ttl(this.getIpLockKey(ip))
    ]);
    const remainingSeconds = Math.max(userLockTtl, ipLockTtl, 0);

    if (remainingSeconds > 0) {
      throw this.createRateLimitError(remainingSeconds);
    }
  }

  async recordFailure(subject: FailureSubject) {
    const username = this.normalizeUsername(subject.username);
    const ip = this.normalizeIp(subject.ip);
    const userFailuresKey = this.getUserFailuresKey(username);
    const ipFailuresKey = this.getIpFailuresKey(ip);

    // 一次登录失败同时累加“用户维度”和“IP 维度”，并刷新失败窗口过期时间。
    // 这里的 expire 不是删除历史审计日志，只是让 Redis 中的实时失败计数自动过期。
    const results = (await this.redis
      .multi()
      .incr(userFailuresKey)
      .expire(userFailuresKey, this.failureWindowSeconds)
      .incr(ipFailuresKey)
      .expire(ipFailuresKey, this.failureWindowSeconds)
      .exec()) as Array<[unknown, number | unknown]>;
    const userFailures = Number(results[0]?.[1] ?? 0);
    const ipFailures = Number(results[2]?.[1] ?? 0);

    const shouldLockUser = userFailures >= this.maxFailuresPerUser;
    const shouldLockIp = ipFailures >= this.maxFailuresPerIp;

    if (shouldLockUser || shouldLockIp) {
      const multi = this.redis.multi();

      if (shouldLockUser) {
        // EX 表示 Redis 自动过期锁定 key；锁定期结束后用户可再次尝试登录。
        multi.set(this.getUserLockKey(username), "1", "EX", this.lockSeconds);
      }

      if (shouldLockIp) {
        // IP 锁定用于挡住同一来源的批量尝试，避免只按用户名防护时被绕过。
        multi.set(this.getIpLockKey(ip), "1", "EX", this.lockSeconds);
      }

      await multi.exec();

      throw this.createRateLimitError(this.lockSeconds);
    }

    // 未达到锁定阈值时，仍然返回普通 401，由 AuthService 记录 failure 登录审计。
    throw new UnauthorizedException("invalid username or password");
  }

  async reset(subject: FailureSubject) {
    const username = this.normalizeUsername(subject.username);
    const ip = this.normalizeIp(subject.ip);

    // 登录成功后清理失败计数和锁定状态，避免历史失败影响后续正常登录。
    await this.redis
      .multi()
      .del(this.getUserFailuresKey(username))
      .del(this.getIpFailuresKey(ip))
      .del(this.getUserLockKey(username))
      .del(this.getIpLockKey(ip))
      .exec();
  }

  isRateLimitError(error: unknown): error is HttpException {
    return (
      error instanceof HttpException &&
      error.getStatus() === HttpStatus.TOO_MANY_REQUESTS
    );
  }

  private getUserFailuresKey(username: string) {
    // 用户维度失败计数，例如 next-bff:login-fail:user:admin。
    return `${this.userKeyPrefix}${username}`;
  }

  private getIpFailuresKey(ip: string) {
    // IP 维度失败计数，例如 next-bff:login-fail:ip:127.0.0.1。
    return `${this.ipKeyPrefix}${ip}`;
  }

  private getUserLockKey(username: string) {
    // 用户锁定 key；assertLoginAllowed 通过 TTL 判断是否仍在锁定期。
    return `${this.lockKeyPrefix}user:${username}`;
  }

  private getIpLockKey(ip: string) {
    // IP 锁定 key；同一个 IP 达到阈值后会直接被拒绝。
    return `${this.lockKeyPrefix}ip:${ip}`;
  }

  private normalizeUsername(username: string) {
    return username.trim().toLowerCase() || "anonymous";
  }

  private normalizeIp(ip: string) {
    return ip.trim() || "unknown";
  }

  private readPositiveInteger(key: string, fallback: number) {
    // 环境变量缺失或配置非法时使用 fallback，避免风控阈值变成 NaN 或 0。
    const value = Number(this.configService.get<string>(key));
    return Number.isInteger(value) && value > 0 ? value : fallback;
  }

  private createRateLimitError(remainingSeconds: number) {
    // 429 告诉客户端“不是密码错误，而是尝试过多，需要等待”。
    return new HttpException(
      `too many login attempts, try again in ${remainingSeconds}s`,
      HttpStatus.TOO_MANY_REQUESTS
    );
  }

  private logRedisError(error: Error) {
    const now = Date.now();

    if (
      now - this.lastRedisErrorLogAt <
      LoginRiskService.REDIS_ERROR_LOG_INTERVAL_MS
    ) {
      return;
    }

    this.lastRedisErrorLogAt = now;
    // Redis 风控不可用属于安全能力降级，需要结构化日志便于排查和告警接入。
    writeStructuredLog({
      context: LoginRiskService.name,
      event: "redis_login_risk_store_error",
      fields: getErrorLogFields(error),
      level: "error",
      message:
        "Redis login risk store error. Start Redis or set REDIS_URL to a reachable Redis instance."
    });
  }
}
