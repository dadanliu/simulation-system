import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";
import {
  getErrorLogFields,
  writeStructuredLog
} from "../common/logging/structured-log";
import type { AuthUser } from "../user/user.types";
import type { CommodityListData } from "./commodity.types";

type CacheState = "fresh" | "miss" | "stale";

type CommodityListCacheEntry = {
  data: CommodityListData;
  freshUntil: number;
};

type CommodityListCacheResult = {
  data: CommodityListData | null;
  key: string;
  state: CacheState;
};

@Injectable()
export class CommodityCacheService implements OnModuleDestroy {
  private static readonly REDIS_ERROR_LOG_INTERVAL_MS = 30_000;

  private readonly freshTtlSeconds: number;
  private readonly keyPrefix: string;
  private readonly redis: Redis;
  private readonly staleTtlSeconds: number;
  private lastRedisErrorLogAt = 0;

  constructor(private readonly configService: ConfigService) {
    this.keyPrefix = this.configService.get<string>(
      "COMMODITY_LIST_CACHE_KEY_PREFIX",
      "next-bff:commodity:list:"
    );
    this.freshTtlSeconds = this.readPositiveInteger(
      "COMMODITY_LIST_CACHE_TTL_SECONDS",
      5
    );
    this.staleTtlSeconds = this.readPositiveInteger(
      "COMMODITY_LIST_CACHE_STALE_SECONDS",
      30
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

  async readCommodityList(
    user: AuthUser,
    backendPath: string
  ): Promise<CommodityListCacheResult> {
    const key = this.buildCommodityListKey(user, backendPath);

    try {
      const rawEntry = await this.redis.get(key);

      if (!rawEntry) {
        return {
          data: null,
          key,
          state: "miss"
        };
      }

      const entry = this.parseCommodityListEntry(rawEntry);

      if (!entry) {
        await this.redis.del(key);

        return {
          data: null,
          key,
          state: "miss"
        };
      }

      return {
        data: entry.data,
        key,
        state: entry.freshUntil >= Date.now() ? "fresh" : "stale"
      };
    } catch (error) {
      this.logRedisError(error as Error);

      return {
        data: null,
        key,
        state: "miss"
      };
    }
  }

  async writeCommodityList(key: string, data: CommodityListData) {
    try {
      const entry: CommodityListCacheEntry = {
        data,
        freshUntil: Date.now() + this.freshTtlSeconds * 1000
      };

      await this.redis.set(
        key,
        JSON.stringify(entry),
        "EX",
        this.freshTtlSeconds + this.staleTtlSeconds
      );
    } catch (error) {
      this.logRedisError(error as Error);
    }
  }

  async invalidateCommodityList() {
    try {
      let cursor = "0";
      let removed = 0;

      do {
        const [nextCursor, keys] = await this.redis.scan(
          cursor,
          "MATCH",
          `${this.keyPrefix}*`,
          "COUNT",
          "100"
        );
        cursor = nextCursor;

        if (keys.length) {
          removed += keys.length;
          await this.redis.del(...keys);
        }
      } while (cursor !== "0");

      writeStructuredLog({
        context: CommodityCacheService.name,
        event: "commodity_list_cache_invalidated",
        fields: {
          removed
        },
        level: "info"
      });
    } catch (error) {
      this.logRedisError(error as Error);
    }
  }

  private buildCommodityListKey(user: AuthUser, backendPath: string) {
    const roles = [...user.roles].sort().join(",");

    return `${this.keyPrefix}${roles}:${backendPath}`;
  }

  private parseCommodityListEntry(rawEntry: string) {
    try {
      const entry = JSON.parse(rawEntry) as Partial<CommodityListCacheEntry>;

      if (!entry.data || typeof entry.freshUntil !== "number") {
        return null;
      }

      return entry as CommodityListCacheEntry;
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

    if (
      now - this.lastRedisErrorLogAt <
      CommodityCacheService.REDIS_ERROR_LOG_INTERVAL_MS
    ) {
      return;
    }

    this.lastRedisErrorLogAt = now;
    writeStructuredLog({
      context: CommodityCacheService.name,
      event: "redis_commodity_cache_error",
      fields: getErrorLogFields(error),
      level: "error",
      message:
        "Redis commodity cache error. List cache is bypassed until Redis is reachable."
    });
  }
}
