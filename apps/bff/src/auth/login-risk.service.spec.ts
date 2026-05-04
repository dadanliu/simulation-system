import { HttpStatus, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { LoginRiskService as LoginRiskServiceClass } from "./login-risk.service";

type StoredValue = {
  expiresAt?: number;
  value: number | string;
};

const mockRedisState = {
  strings: new Map<string, StoredValue>()
};

jest.mock("ioredis", () => {
  class MockRedis {
    disconnect = jest.fn();
    on = jest.fn();

    get(key: string) {
      const item = mockRedisState.strings.get(key);

      if (!item) {
        return Promise.resolve(null);
      }

      if (item.expiresAt && item.expiresAt <= Date.now()) {
        mockRedisState.strings.delete(key);
        return Promise.resolve(null);
      }

      return Promise.resolve(String(item.value));
    }

    ttl(key: string) {
      const item = mockRedisState.strings.get(key);

      if (!item || !item.expiresAt) {
        return Promise.resolve(-1);
      }

      if (item.expiresAt <= Date.now()) {
        mockRedisState.strings.delete(key);
        return Promise.resolve(-2);
      }

      return Promise.resolve(Math.ceil((item.expiresAt - Date.now()) / 1000));
    }

    multi() {
      const results: Array<[unknown, unknown]> = [];
      const commands: Array<() => void> = [];
      const pipeline = {
        del: (key: string) => {
          commands.push(() => {
            mockRedisState.strings.delete(key);
            results.push([null, 1]);
          });
          return pipeline;
        },
        exec: () => {
          commands.forEach((command) => command());
          return Promise.resolve(results);
        },
        expire: (key: string, seconds: number) => {
          commands.push(() => {
            const current = mockRedisState.strings.get(key);

            if (current) {
              current.expiresAt = Date.now() + seconds * 1000;
              mockRedisState.strings.set(key, current);
            }

            results.push([null, 1]);
          });
          return pipeline;
        },
        incr: (key: string) => {
          commands.push(() => {
            const current = mockRedisState.strings.get(key);
            const nextValue = Number(current?.value ?? 0) + 1;

            mockRedisState.strings.set(key, {
              expiresAt: current?.expiresAt,
              value: nextValue
            });
            results.push([null, nextValue]);
          });
          return pipeline;
        },
        set: (key: string, value: string, mode: string, seconds: number) => {
          commands.push(() => {
            mockRedisState.strings.set(key, {
              expiresAt: mode === "EX" ? Date.now() + seconds * 1000 : undefined,
              value
            });
            results.push([null, "OK"]);
          });
          return pipeline;
        }
      };

      return pipeline;
    }
  }

  return {
    __esModule: true,
    default: MockRedis
  };
});

let LoginRiskService: typeof LoginRiskServiceClass;

function createConfig(values: Record<string, string | undefined> = {}) {
  return {
    get: jest.fn((key: string, fallback?: string) => values[key] ?? fallback)
  } as unknown as ConfigService;
}

describe("LoginRiskService", () => {
  beforeAll(async () => {
    ({ LoginRiskService } = await import("./login-risk.service"));
  });

  beforeEach(() => {
    jest.useRealTimers();
    mockRedisState.strings.clear();
  });

  it("locks a username after repeated failures within the window", async () => {
    const service = new LoginRiskService(
      createConfig({
        LOGIN_LOCK_SECONDS: "60",
        LOGIN_MAX_FAILURES_PER_IP: "50",
        LOGIN_MAX_FAILURES_PER_USER: "3"
      })
    );

    await expect(service.recordFailure({ ip: "127.0.0.1", username: "admin" })).rejects.toBeInstanceOf(
      UnauthorizedException
    );
    await expect(service.recordFailure({ ip: "127.0.0.1", username: "admin" })).rejects.toBeInstanceOf(
      UnauthorizedException
    );
    await expect(service.recordFailure({ ip: "127.0.0.1", username: "admin" })).rejects.toMatchObject({
      status: HttpStatus.TOO_MANY_REQUESTS
    });
    await expect(service.assertLoginAllowed({ ip: "127.0.0.1", username: "admin" })).rejects.toMatchObject({
      status: HttpStatus.TOO_MANY_REQUESTS
    });
  });

  it("resets counters and locks after a successful login", async () => {
    const service = new LoginRiskService(
      createConfig({
        LOGIN_LOCK_SECONDS: "60",
        LOGIN_MAX_FAILURES_PER_IP: "50",
        LOGIN_MAX_FAILURES_PER_USER: "2"
      })
    );

    await expect(service.recordFailure({ ip: "127.0.0.1", username: "admin" })).rejects.toBeInstanceOf(
      UnauthorizedException
    );
    await service.reset({ ip: "127.0.0.1", username: "admin" });
    await expect(service.assertLoginAllowed({ ip: "127.0.0.1", username: "admin" })).resolves.toBeUndefined();
  });
});
