import { Injectable, NotFoundException } from "@nestjs/common";
import { RoleService } from "../role/role.service";
import { mockPermissions } from "./mock-permissions";
import type { Permission, PermissionCode } from "./permission.types";

@Injectable()
export class PermissionService {
  private readonly permissions = mockPermissions;

  constructor(private readonly roleService: RoleService) {}

  listPermissions() {
    return this.permissions;
  }

  getPermission(code: string) {
    return this.permissions.find((permission) => permission.code === code) ?? null;
  }

  createPermission(permission: Permission) {
    if (this.getPermission(permission.code)) {
      return permission;
    }

    this.permissions.push(permission);
    return permission;
  }

  updatePermission(code: string, body: Partial<Omit<Permission, "code">>) {
    const permission = this.getPermission(code);

    if (!permission) {
      throw new NotFoundException("permission not found");
    }

    Object.assign(permission, body);
    return permission;
  }

  assertPermissionCodes(codes: string[]): PermissionCode[] {
    const unknownCode = codes.find((code) => !this.getPermission(code));

    if (unknownCode) {
      throw new NotFoundException(`permission not found: ${unknownCode}`);
    }

    return codes as PermissionCode[];
  }

  hasAllPermissionsByRoleCodes(roleCodes: string[], requiredPermissions: PermissionCode[]) {
    const userPermissions = this.roleService.getPermissionCodesByRoleCodes(roleCodes);
    return requiredPermissions.every((permission) => userPermissions.includes(permission));
  }
}
