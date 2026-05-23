import { ForbiddenException, type ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { AuthenticatedRequest } from "../auth/auth-request";
import { Public } from "../auth/public.decorator";
import type { AuthUser } from "../user/user.types";
import type { PermissionService } from "./permission.service";
import { RequirePermissions } from "./permissions.decorator";
import { PermissionsGuard } from "./permissions.guard";

const adminUser: AuthUser = {
  id: "u_001",
  permissions: ["commodity:read"],
  roles: ["admin"],
  tenantId: "tenant_demo",
  username: "admin"
};

class TestController {
  noPermissionHandler() {
    return undefined;
  }

  @Public()
  publicHandler() {
    return undefined;
  }

  @RequirePermissions("commodity:read")
  protectedHandler() {
    return undefined;
  }
}

function createContext(
  request: Partial<AuthenticatedRequest>,
  handler: () => undefined = TestController.prototype.noPermissionHandler
) {
  return {
    getClass: () => TestController,
    getHandler: () => handler,
    switchToHttp: () => ({
      getRequest: () => request
    })
  } as unknown as ExecutionContext;
}

function createGuard(hasAllPermissionsByRoleCodes = jest.fn()) {
  return new PermissionsGuard(new Reflector(), {
    hasAllPermissionsByRoleCodes
  } as unknown as PermissionService);
}

describe("PermissionsGuard", () => {
  it("allows public routes without checking permissions", async () => {
    const hasAllPermissionsByRoleCodes = jest.fn();
    const guard = createGuard(hasAllPermissionsByRoleCodes);

    await expect(
      guard.canActivate(
        createContext({}, TestController.prototype.publicHandler)
      )
    ).resolves.toBe(true);
    expect(hasAllPermissionsByRoleCodes).not.toHaveBeenCalled();
  });

  it("allows authenticated routes with no required permissions", async () => {
    const hasAllPermissionsByRoleCodes = jest.fn();
    const guard = createGuard(hasAllPermissionsByRoleCodes);

    await expect(guard.canActivate(createContext({}))).resolves.toBe(true);
    expect(hasAllPermissionsByRoleCodes).not.toHaveBeenCalled();
  });

  it("checks declared permissions against the current user roles", async () => {
    const hasAllPermissionsByRoleCodes = jest.fn().mockResolvedValue(true);
    const guard = createGuard(hasAllPermissionsByRoleCodes);

    await expect(
      guard.canActivate(
        createContext(
          { currentUser: adminUser },
          TestController.prototype.protectedHandler
        )
      )
    ).resolves.toBe(true);
    expect(hasAllPermissionsByRoleCodes).toHaveBeenCalledWith(
      ["admin"],
      ["commodity:read"]
    );
  });

  it("rejects missing permissions", async () => {
    const hasAllPermissionsByRoleCodes = jest.fn().mockResolvedValue(false);
    const guard = createGuard(hasAllPermissionsByRoleCodes);

    await expect(
      guard.canActivate(
        createContext(
          { currentUser: adminUser },
          TestController.prototype.protectedHandler
        )
      )
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
