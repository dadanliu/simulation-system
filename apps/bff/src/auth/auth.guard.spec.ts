import { UnauthorizedException, type ExecutionContext } from "@nestjs/common";
import { AuthGuard } from "./auth.guard";
import type { GetCurrentUserService } from "./get-current-user";
import type { AuthenticatedRequest } from "./auth-request";
import type { AuthUser } from "../user/user.types";

const adminUser: AuthUser = {
  id: "u_001",
  permissions: ["commodity:create"],
  roles: ["admin"],
  tenantId: "tenant_demo",
  username: "admin"
};

function createContext(request: Partial<AuthenticatedRequest>) {
  return {
    switchToHttp: () => ({
      getRequest: () => request
    })
  } as unknown as ExecutionContext;
}

function createGuard(execute = jest.fn()) {
  return new AuthGuard({
    execute
  } as unknown as GetCurrentUserService);
}

describe("AuthGuard", () => {
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
