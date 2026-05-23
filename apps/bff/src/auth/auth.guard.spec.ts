import { UnauthorizedException, type ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthGuard } from "./auth.guard";
import type { GetCurrentUserService } from "./get-current-user";
import type { AuthenticatedRequest } from "./auth-request";
import { Public } from "./public.decorator";
import type { AuthUser } from "../user/user.types";

const adminUser: AuthUser = {
  id: "u_001",
  permissions: ["commodity:create"],
  roles: ["admin"],
  tenantId: "tenant_demo",
  username: "admin"
};

class TestController {
  testHandler() {
    return undefined;
  }

  @Public()
  publicHandler() {
    return undefined;
  }
}

function createContext(
  request: Partial<AuthenticatedRequest>,
  handler: () => undefined = TestController.prototype.testHandler
) {
  return {
    getClass: () => TestController,
    getHandler: () => handler,
    switchToHttp: () => ({
      getRequest: () => request
    })
  } as unknown as ExecutionContext;
}

function createGuard(execute = jest.fn()) {
  return new AuthGuard(new Reflector(), {
    execute
  } as unknown as GetCurrentUserService);
}

describe("AuthGuard", () => {
  it("allows public routes without resolving current user", async () => {
    const execute = jest.fn();
    const guard = createGuard(execute);

    await expect(
      guard.canActivate(
        createContext({}, TestController.prototype.publicHandler)
      )
    ).resolves.toBe(true);
    expect(execute).not.toHaveBeenCalled();
  });

  it("reuses currentUser already attached to the request", async () => {
    const execute = jest.fn();
    const guard = createGuard(execute);
    const request = {
      currentUser: adminUser
    };

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);
    expect(execute).not.toHaveBeenCalled();
  });

  it("loads currentUser when it is not already attached", async () => {
    const execute = jest.fn().mockResolvedValue(adminUser);
    const guard = createGuard(execute);
    const request: Partial<AuthenticatedRequest> = {};

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);
    expect(execute).toHaveBeenCalledWith(request);
    expect(request.currentUser).toBe(adminUser);
  });

  it("rejects requests when no current user can be resolved", async () => {
    const execute = jest.fn().mockResolvedValue(null);
    const guard = createGuard(execute);

    await expect(guard.canActivate(createContext({}))).rejects.toBeInstanceOf(
      UnauthorizedException
    );
  });
});
