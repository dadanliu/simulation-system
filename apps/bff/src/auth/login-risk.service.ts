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

@Injectable()
export class LoginRiskService implements OnModuleDestroy {
  private static readonly REDIS_ERROR_LOG_INTERVAL_MS = 30_000;

  private readonly redis: Redis;
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
    this.redis.disconnect();
  }

  async assertLoginAllowed(subject: FailureSubject) {
    const username = this.normalizeUsername(subject.username);
    const ip = this.normalizeIp(subject.ip);
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
        multi.set(this.getUserLockKey(username), "1", "EX", this.lockSeconds);
      }

      if (shouldLockIp) {
        multi.set(this.getIpLockKey(ip), "1", "EX", this.lockSeconds);
      }

      await multi.exec();

      throw this.createRateLimitError(this.lockSeconds);
    }

    throw new UnauthorizedException("invalid username or password");
  }

  async reset(subject: FailureSubject) {
    const username = this.normalizeUsername(subject.username);
    const ip = this.normalizeIp(subject.ip);

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
    return `${this.userKeyPrefix}${username}`;
  }

  private getIpFailuresKey(ip: string) {
    return `${this.ipKeyPrefix}${ip}`;
  }

  private getUserLockKey(username: string) {
    return `${this.lockKeyPrefix}user:${username}`;
  }

  private getIpLockKey(ip: string) {
    return `${this.lockKeyPrefix}ip:${ip}`;
  }

  private normalizeUsername(username: string) {
    return username.trim().toLowerCase() || "anonymous";
  }

  private normalizeIp(ip: string) {
    return ip.trim() || "unknown";
  }

  private readPositiveInteger(key: string, fallback: number) {
    const value = Number(this.configService.get<string>(key));
    return Number.isInteger(value) && value > 0 ? value : fallback;
  }

  private createRateLimitError(remainingSeconds: number) {
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
