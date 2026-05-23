import type { ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ThrottlerException, ThrottlerStorageService } from "@nestjs/throttler";
import type { AuthenticatedRequest } from "../auth/auth-request";
import type { GetCurrentUserService } from "../auth/get-current-user";
import { BffThrottlerGuard } from "./bff-throttler.guard";
import { createBffThrottlerOptions } from "./rate-limit.config";

class TestController {}

function testHandler() {
  return undefined;
}

function createContext(request: Partial<AuthenticatedRequest>) {
  const response = {
    header: jest.fn()
  };

  return {
    context: {
      getClass: () => TestController,
      getHandler: () => testHandler,
      switchToHttp: () => ({
        getRequest: () => ({
          headers: {},
          ip: "127.0.0.1",
          method: "GET",
          originalUrl: "/",
          url: "/",
          ...request
        }),
        getResponse: () => response
      })
    } as unknown as ExecutionContext,
    response
  };
}

function createGuard(getCurrentUserService?: Partial<GetCurrentUserService>) {
  const storage = new ThrottlerStorageService();
  const guard = new BffThrottlerGuard(
    createBffThrottlerOptions(),
    storage,
    new Reflector(),
    {
      execute: jest.fn().mockResolvedValue(null),
      ...getCurrentUserService
    } as unknown as GetCurrentUserService
  );

  return {
    guard,
    storage
  };
}

describe("BffThrottlerGuard", () => {
  it("blocks repeated login attempts by username before controller logic", async () => {
    const { guard, storage } = createGuard();
    await guard.onModuleInit();

    for (let index = 0; index < 5; index += 1) {
      const { context } = createContext({
        body: { username: "admin" },
        method: "POST",
        originalUrl: "/api/auth/login",
        url: "/api/auth/login"
      });

      await expect(guard.canActivate(context)).resolves.toBe(true);
    }

    const { context } = createContext({
      body: { username: "ADMIN" },
      method: "POST",
      originalUrl: "/api/auth/login",
      url: "/api/auth/login"
    });

    await expect(guard.canActivate(context)).rejects.toThrow(ThrottlerException);
    storage.onApplicationShutdown();
  });

  it("resolves current user before applying upload user and tenant limits", async () => {
    const execute = jest.fn().mockResolvedValue({
      id: "u_001",
      permissions: [],
      roles: [],
      tenantId: "tenant_demo",
      username: "admin"
    });
    const { guard, storage } = createGuard({ execute });
    await guard.onModuleInit();
    const { context } = createContext({
      method: "POST",
      originalUrl: "/api/upload",
      url: "/api/upload"
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(execute).toHaveBeenCalledTimes(1);
    storage.onApplicationShutdown();
  });
});
