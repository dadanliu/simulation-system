import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { RoleEntity, type RoleDocument } from "../role/schemas/role.schema";
import {
  PermissionEntity,
  type PermissionDocument
} from "./schemas/permission.schema";
import type { Permission, PermissionCode } from "./permission.types";

@Injectable()
export class PermissionService {
  constructor(
    @InjectModel(PermissionEntity.name)
    private readonly permissionModel: Model<PermissionDocument>,
    @InjectModel(RoleEntity.name)
    private readonly roleModel: Model<RoleDocument>
  ) {}

  listPermissions() {
    return this.permissionModel.find().sort({ code: 1 }).lean();
  }

  getPermission(code: string) {
    return this.permissionModel.findOne({ code }).lean();
  }

  async createPermission(permission: Permission) {
    const existingPermission = await this.getPermission(permission.code);

    if (existingPermission) {
      return existingPermission;
    }

    return this.permissionModel.create(permission);
  }

  async updatePermission(
    code: string,
    body: Partial<Omit<Permission, "code">>
  ) {
    const permission = await this.permissionModel
      .findOneAndUpdate({ code }, { $set: body }, { new: true })
      .lean();

    if (!permission) {
      throw new NotFoundException("permission not found");
    }

    return permission;
  }

  async assertPermissionCodes(codes: string[]): Promise<PermissionCode[]> {
    const permissions = await this.permissionModel
      .find({ code: { $in: codes } }, { code: 1, _id: 0 })
      .lean();
    const existingCodes = new Set(
      permissions.map((permission) => permission.code)
    );
    const unknownCode = codes.find((code) => !existingCodes.has(code));

    if (unknownCode) {
      throw new NotFoundException(`permission not found: ${unknownCode}`);
    }

    return codes as PermissionCode[];
  }

  async hasAllPermissionsByRoleCodes(
    roleCodes: string[],
    requiredPermissions: PermissionCode[]
  ) {
    const roles = await this.roleModel
      .find({ code: { $in: roleCodes } }, { permissions: 1, _id: 0 })
      .lean();
    const userPermissions = new Set(roles.flatMap((role) => role.permissions));

    return requiredPermissions.every((permission) =>
      userPermissions.has(permission)
    );
  }
}
