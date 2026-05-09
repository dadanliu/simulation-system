import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { PermissionEntity, type PermissionDocument } from "../permission/schemas/permission.schema";
import type { PermissionCode } from "../permission/permission.types";
import { RoleEntity, type RoleDocument } from "./schemas/role.schema";
import type { Role } from "./role.types";

@Injectable()
export class RoleService {
  constructor(
    @InjectModel(RoleEntity.name) private readonly roleModel: Model<RoleDocument>,
    @InjectModel(PermissionEntity.name) private readonly permissionModel: Model<PermissionDocument>
  ) {}

  listRoles() {
    return this.roleModel.find().sort({ code: 1 }).lean();
  }

  getRole(code: string) {
    return this.roleModel.findOne({ code }).lean();
  }

  async createRole(role: Role) {
    const existingRole = await this.getRole(role.code);

    if (existingRole) {
      return existingRole;
    }

    await this.assertPermissionCodes(role.permissions);
    return this.roleModel.create(role);
  }

  async updateRole(code: string, body: Partial<Omit<Role, "code">>) {
    if (body.permissions) {
      await this.assertPermissionCodes(body.permissions);
    }

    const role = await this.roleModel.findOneAndUpdate({ code }, { $set: body }, { new: true }).lean();

    if (!role) {
      throw new NotFoundException("role not found");
    }

    return role;
  }

  bindPermissions(code: string, permissions: PermissionCode[], _reason: string) {
    return this.updateRole(code, { permissions });
  }

  async getPermissionCodesByRoleCodes(roleCodes: string[]) {
    const roles = await this.roleModel.find({ code: { $in: roleCodes } }, { permissions: 1, _id: 0 }).lean();
    const permissionCodes = new Set<PermissionCode>();

    for (const role of roles) {
      for (const permission of role.permissions) {
        permissionCodes.add(permission as PermissionCode);
      }
    }

    return [...permissionCodes];
  }

  async assertRoleCodes(roleCodes: string[]) {
    const roles = await this.roleModel.find({ code: { $in: roleCodes } }, { code: 1, _id: 0 }).lean();
    const existingRoleCodes = new Set(roles.map((role) => role.code));
    const unknownRole = roleCodes.find((roleCode) => !existingRoleCodes.has(roleCode));

    if (unknownRole) {
      throw new NotFoundException(`role not found: ${unknownRole}`);
    }

    return roleCodes;
  }

  private async assertPermissionCodes(codes: string[]) {
    const permissions = await this.permissionModel.find({ code: { $in: codes } }, { code: 1, _id: 0 }).lean();
    const existingCodes = new Set(permissions.map((permission) => permission.code));
    const unknownCode = codes.find((code) => !existingCodes.has(code));

    if (unknownCode) {
      throw new NotFoundException(`permission not found: ${unknownCode}`);
    }
  }
}
