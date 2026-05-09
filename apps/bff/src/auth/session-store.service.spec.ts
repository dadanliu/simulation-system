import { ConfigService } from "@nestjs/config";
import type { SessionStoreService as SessionStoreServiceClass } from "./session-store.service";

type StoredValue = {
  expiresAt?: number;
  value: string;
};

const mockRedisState = {
  sets: new Map<string, Set<string>>(),
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

      return Promise.resolve(item.value);
    }

    smembers(key: string) {
      return Promise.resolve([
        ...(mockRedisState.sets.get(key) ?? new Set<string>())
      ]);
    }

    multi() {
      const commands: Array<() => void> = [];
      const pipeline = {
        del: (key: string) => {
          commands.push(() => mockRedisState.strings.delete(key));
          return pipeline;
        },
        exec: () => {
          commands.forEach((command) => command());
          return Promise.resolve([]);
        },
        expire: (_key: string, _seconds: number) => pipeline,
        sadd: (key: string, value: string) => {
          commands.push(() => {
            const set = mockRedisState.sets.get(key) ?? new Set<string>();

            set.add(value);
            mockRedisState.sets.set(key, set);
          });
          return pipeline;
        },
        set: (key: string, value: string, mode: string, seconds: number) => {
          commands.push(() =>
            mockRedisState.strings.set(key, {
              expiresAt:
                mode === "EX" ? Date.now() + seconds * 1000 : undefined,
              value
            })
          );
          return pipeline;
        },
        srem: (key: string, value: string) => {
          commands.push(() => mockRedisState.sets.get(key)?.delete(value));
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

let SessionStoreService: typeof SessionStoreServiceClass;

function createConfig(values: Record<string, string | undefined> = {}) {
  return {
    get: jest.fn((key: string, fallback?: string) => values[key] ?? fallback)
  } as unknown as ConfigService;
}

describe("SessionStoreService", () => {
  beforeAll(async () => {
    ({ SessionStoreService } = await import("./session-store.service"));
  });

  beforeEach(() => {
    jest.useRealTimers();
    mockRedisState.sets.clear();
    mockRedisState.strings.clear();
  });

  it("stores sessions in redis with TTL and reads them after service restart", async () => {
    const config = createConfig({ SESSION_TTL_SECONDS: "60" });
    const firstService = new SessionStoreService(config);
    const sessionId = await firstService.createSession("u_admin_001", {
      ip: "127.0.0.1",
      userAgent: "jest"
    });
    const secondService = new SessionStoreService(config);

    const session = await secondService.getSession(sessionId);

    expect(
      mockRedisState.strings.get(`next-bff:session:${sessionId}`)?.expiresAt
    ).toBeGreaterThan(Date.now());
    expect(session).toEqual(
      expect.objectContaining({
        device: {
          ip: "127.0.0.1",
          userAgent: "jest"
        },
        sessionId,
        userId: "u_admin_001"
      })
    );
  });

  it("deletes sessions immediately on logout", async () => {
    const service = new SessionStoreService(createConfig());
    const sessionId = await service.createSession("u_admin_001");

    await service.deleteSession(sessionId);

    await expect(service.getSession(sessionId)).resolves.toBeNull();
  });

  it("returns null for expired sessions", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-05-04T00:00:00.000Z"));
    const service = new SessionStoreService(
      createConfig({ SESSION_TTL_SECONDS: "1" })
    );
    const sessionId = await service.createSession("u_admin_001");

    jest.setSystemTime(new Date("2026-05-04T00:00:02.000Z"));

    await expect(service.getSession(sessionId)).resolves.toBeNull();
  });

  it("supports multiple sessions per user", async () => {
    const service = new SessionStoreService(createConfig());
    const firstSessionId = await service.createSession("u_admin_001", {
      userAgent: "Chrome"
    });
    const secondSessionId = await service.createSession("u_admin_001", {
      userAgent: "Safari"
    });

    const sessions = await service.listUserSessions("u_admin_001");

    expect(sessions.map((session) => session.sessionId).sort()).toEqual(
      [firstSessionId, secondSessionId].sort()
    );
    expect(sessions.map((session) => session.device.userAgent).sort()).toEqual([
      "Chrome",
      "Safari"
    ]);
  });
});
