import { Injectable, NotFoundException } from "@nestjs/common";
import { mockPermissions } from "../permission/mock-permissions";
import type { PermissionCode } from "../permission/permission.types";
import { mockRoles } from "./mock-roles";
import type { Role } from "./role.types";

@Injectable()
export class RoleService {
  private readonly roles = mockRoles;

  listRoles() {
    return this.roles;
  }

  getRole(code: string) {
    return this.roles.find((role) => role.code === code) ?? null;
  }

  createRole(role: Role) {
    if (this.getRole(role.code)) {
      return role;
    }

    this.assertPermissionCodes(role.permissions);
    this.roles.push(role);
    return role;
  }

  updateRole(code: string, body: Partial<Omit<Role, "code">>) {
    const role = this.getRole(code);

    if (!role) {
      throw new NotFoundException("role not found");
    }

    if (body.permissions) {
      this.assertPermissionCodes(body.permissions);
    }

    Object.assign(role, body);
    return role;
  }

  bindPermissions(code: string, permissions: PermissionCode[]) {
    return this.updateRole(code, { permissions });
  }

  getPermissionCodesByRoleCodes(roleCodes: string[]) {
    const permissionCodes = new Set<PermissionCode>();

    for (const roleCode of roleCodes) {
      const role = this.getRole(roleCode);

      for (const permission of role?.permissions ?? []) {
        permissionCodes.add(permission);
      }
    }

    return [...permissionCodes];
  }

  assertRoleCodes(roleCodes: string[]) {
    const unknownRole = roleCodes.find((roleCode) => !this.getRole(roleCode));

    if (unknownRole) {
      throw new NotFoundException(`role not found: ${unknownRole}`);
    }

    return roleCodes;
  }

  private assertPermissionCodes(codes: string[]) {
    const unknownCode = codes.find((code) => !mockPermissions.some((permission) => permission.code === code));

    if (unknownCode) {
      throw new NotFoundException(`permission not found: ${unknownCode}`);
    }
  }
}
