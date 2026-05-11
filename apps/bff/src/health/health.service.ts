import {
  BeforeApplicationShutdown,
  Injectable,
  OnModuleDestroy
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectConnection } from "@nestjs/mongoose";
import Redis from "ioredis";
import type { Connection } from "mongoose";
import { writeStructuredLog } from "../common/logging/structured-log";

type DependencyStatus = "down" | "up";
type HealthStatus = "draining" | "ok" | "unready";

type DependencyCheck = {
  durationMs: number;
  message?: string;
  name: string;
  status: DependencyStatus;
};

type HealthResponse = {
  commitSha: string;
  dependencies: DependencyCheck[];
  env: string;
  releaseNotesUrl: string;
  service: "bff";
  status: HealthStatus;
  timestamp: string;
  uptimeSeconds: number;
  version: string;
};

function toMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

@Injectable()
export class HealthService
  implements BeforeApplicationShutdown, OnModuleDestroy
{
  private readonly gracefulShutdownDrainMs: number;
  private readonly healthCheckTimeoutMs: number;
  private readonly redis: Redis;
  private draining = false;

  constructor(
    private readonly configService: ConfigService,
    @InjectConnection() private readonly mongoConnection: Connection
  ) {
    this.gracefulShutdownDrainMs =
      this.readPositiveInteger("GRACEFUL_SHUTDOWN_DRAIN_SECONDS", 5) * 1000;
    this.healthCheckTimeoutMs = this.readPositiveInteger(
      "HEALTH_CHECK_TIMEOUT_MS",
      2_000
    );
    this.redis = new Redis(
      this.configService.get<string>("REDIS_URL", "redis://127.0.0.1:6379"),
      {
        enableOfflineQueue: false,
        maxRetriesPerRequest: 1,
        retryStrategy: (times) => Math.min(times * 500, 5_000)
      }
    );
    this.redis.on("error", () => undefined);
  }

  async onModuleDestroy() {
    this.redis.disconnect();
  }

  async beforeApplicationShutdown(signal?: string) {
    this.draining = true;
    writeStructuredLog({
      context: HealthService.name,
      event: "bff_shutdown_draining_started",
      fields: {
        drainMs: this.gracefulShutdownDrainMs,
        signal
      },
      level: "warn"
    });
    await this.sleep(this.gracefulShutdownDrainMs);
  }

  getLive(): HealthResponse {
    return this.buildResponse([], this.draining ? "draining" : "ok");
  }

  async getReady(): Promise<HealthResponse> {
    const dependencies = await Promise.all([
      this.checkMongoDb(),
      this.checkRedis(),
      this.checkBackend()
    ]);
    const status =
      this.draining || dependencies.some((item) => item.status === "down")
        ? "unready"
        : "ok";

    return this.buildResponse(dependencies, status);
  }

  async assertStartupReady() {
    const dependencies = await Promise.all([
      this.checkMongoDb(),
      this.checkRedis()
    ]);
    const failedDependency = dependencies.find(
      (dependency) => dependency.status === "down"
    );

    if (!failedDependency) {
      return;
    }

    throw new Error(
      `BFF startup dependency check failed: ${failedDependency.name} ${failedDependency.message ?? "is down"}`
    );
  }

  private buildResponse(
    dependencies: DependencyCheck[],
    status: HealthStatus
  ): HealthResponse {
    return {
      commitSha: this.configService.get<string>("RELEASE_COMMIT_SHA", "local"),
      dependencies,
      env: this.configService.get<string>("APP_ENV", "development"),
      releaseNotesUrl: this.configService.get<string>("RELEASE_NOTES_URL", ""),
      service: "bff",
      status,
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      version: this.configService.get<string>("APP_VERSION", "local")
    };
  }

  private async checkMongoDb(): Promise<DependencyCheck> {
    return this.measureDependency("mongodb", async () => {
      if (this.mongoConnection.readyState !== 1 || !this.mongoConnection.db) {
        throw new Error(
          `MongoDB connection is not ready, readyState=${this.mongoConnection.readyState}`
        );
      }

      await this.withTimeout(
        "MongoDB ping timed out",
        this.mongoConnection.db.admin().ping()
      );
    });
  }

  private async checkRedis(): Promise<DependencyCheck> {
    return this.measureDependency("redis", async () => {
      await this.withTimeout("Redis ping timed out", this.redis.ping());
    });
  }

  private async checkBackend(): Promise<DependencyCheck> {
    return this.measureDependency("backend", async () => {
      const baseUrl = this.configService.getOrThrow<string>("BACKEND_BASE_URL");
      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        this.healthCheckTimeoutMs
      );

      try {
        const response = await fetch(`${baseUrl}/api/health/ready`, {
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error(
            `Backend ready check returned HTTP ${response.status}`
          );
        }
      } finally {
        clearTimeout(timeout);
      }
    });
  }

  private async measureDependency(
    name: string,
    check: () => Promise<void>
  ): Promise<DependencyCheck> {
    const startedAt = Date.now();

    try {
      await check();

      return {
        durationMs: Date.now() - startedAt,
        name,
        status: "up"
      };
    } catch (error) {
      return {
        durationMs: Date.now() - startedAt,
        message: toMessage(error),
        name,
        status: "down"
      };
    }
  }

  private async withTimeout(message: string, operation: Promise<unknown>) {
    let timeout: NodeJS.Timeout | undefined;

    try {
      await Promise.race([
        operation,
        new Promise((_, reject) => {
          timeout = setTimeout(
            () => reject(new Error(message)),
            this.healthCheckTimeoutMs
          );
        })
      ]);
    } finally {
      if (timeout) {
        clearTimeout(timeout);
      }
    }
  }

  private readPositiveInteger(key: string, fallback: number) {
    const value = Number(this.configService.get<string>(key));

    return Number.isInteger(value) && value > 0 ? value : fallback;
  }

  private sleep(ms: number) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }
}
