import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";
import { randomUUID } from "node:crypto";
import { SESSION_MAX_AGE_SECONDS } from "./session-cookie";

export type SessionDevice = {
  ip?: string;
  userAgent?: string;
};

export type SessionRecord = {
  createdAt: number;
  device: SessionDevice;
  expiresAt: number;
  sessionId: string;
  userId: string;
};

@Injectable()
export class SessionStoreService implements OnModuleDestroy {
  private static readonly REDIS_ERROR_LOG_INTERVAL_MS = 30_000;

  private readonly logger = new Logger(SessionStoreService.name);
  private readonly redis: Redis;
  private readonly sessionKeyPrefix: string;
  private readonly userSessionsKeyPrefix: string;
  private readonly ttlSeconds: number;
  private lastRedisErrorLogAt = 0;

  constructor(private readonly configService: ConfigService) {
    this.ttlSeconds = this.readPositiveInteger("SESSION_TTL_SECONDS", SESSION_MAX_AGE_SECONDS);
    this.sessionKeyPrefix = this.configService.get<string>("SESSION_REDIS_KEY_PREFIX", "next-bff:session:");
    this.userSessionsKeyPrefix = this.configService.get<string>(
      "SESSION_USER_REDIS_KEY_PREFIX",
      "next-bff:user-sessions:"
    );
    this.redis = new Redis(this.configService.get<string>("REDIS_URL", "redis://127.0.0.1:6379"), {
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      retryStrategy: (times) => Math.min(times * 500, 5_000)
    });
    this.redis.on("error", (error) => {
      this.logRedisError(error);
    });
  }

  async onModuleDestroy() {
    this.redis.disconnect();
  }

  getSessionTtlSeconds() {
    return this.ttlSeconds;
  }

  async createSession(userId: string, device: SessionDevice = {}) {
    const sessionId = randomUUID();
    const now = Date.now();
    const session: SessionRecord = {
      createdAt: now,
      device,
      expiresAt: now + this.ttlSeconds * 1000,
      sessionId,
      userId
    };

    await this.redis
      .multi()
      .set(this.getSessionKey(sessionId), JSON.stringify(session), "EX", this.ttlSeconds)
      .sadd(this.getUserSessionsKey(userId), sessionId)
      .expire(this.getUserSessionsKey(userId), this.ttlSeconds)
      .exec();

    return sessionId;
  }

  async getSession(sessionId: string | null) {
    if (!sessionId) {
      return null;
    }

    const sessionJson = await this.redis.get(this.getSessionKey(sessionId));

    if (!sessionJson) {
      return null;
    }

    const session = this.parseSession(sessionJson);

    if (!session || session.expiresAt <= Date.now()) {
      await this.deleteSession(sessionId);
      return null;
    }

    return session;
  }

  async deleteSession(sessionId: string | null) {
    if (!sessionId) {
      return;
    }

    const sessionJson = await this.redis.get(this.getSessionKey(sessionId));
    const session = sessionJson ? this.parseSession(sessionJson) : null;
    const multi = this.redis.multi().del(this.getSessionKey(sessionId));

    if (session) {
      multi.srem(this.getUserSessionsKey(session.userId), sessionId);
    }

    await multi.exec();
  }

  async listUserSessions(userId: string) {
    const sessionIds = await this.redis.smembers(this.getUserSessionsKey(userId));
    const sessions = await Promise.all(sessionIds.map((sessionId) => this.getSession(sessionId)));
    const activeSessions = sessions.filter((session): session is SessionRecord => Boolean(session));

    return activeSessions.sort((left, right) => right.createdAt - left.createdAt);
  }

  private getSessionKey(sessionId: string) {
    return `${this.sessionKeyPrefix}${sessionId}`;
  }

  private getUserSessionsKey(userId: string) {
    return `${this.userSessionsKeyPrefix}${userId}`;
  }

  private parseSession(value: string): SessionRecord | null {
    try {
      const session = JSON.parse(value) as Partial<SessionRecord>;

      if (
        typeof session.sessionId !== "string" ||
        typeof session.userId !== "string" ||
        typeof session.createdAt !== "number" ||
        typeof session.expiresAt !== "number"
      ) {
        return null;
      }

      return {
        createdAt: session.createdAt,
        device: session.device ?? {},
        expiresAt: session.expiresAt,
        sessionId: session.sessionId,
        userId: session.userId
      };
    } catch {
      return null;
    }
  }

  private readPositiveInteger(key: string, fallback: number) {
    const value = Number(this.configService.get<string>(key));
    return Number.isInteger(value) && value > 0 ? value : fallback;
  }

  private logRedisError(error: Error) {
    const now = Date.now();

    if (now - this.lastRedisErrorLogAt < SessionStoreService.REDIS_ERROR_LOG_INTERVAL_MS) {
      return;
    }

    this.lastRedisErrorLogAt = now;
    this.logger.error(
      `Redis session store error: ${error.message}. Start Redis or set REDIS_URL to a reachable Redis instance.`
    );
  }
}
