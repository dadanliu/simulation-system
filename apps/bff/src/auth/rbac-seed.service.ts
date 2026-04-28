import { Injectable, type OnModuleInit } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { mockPermissions } from "../permission/mock-permissions";
import { PermissionEntity, type PermissionDocument } from "../permission/schemas/permission.schema";
import { mockRoles } from "../role/mock-roles";
import { RoleEntity, type RoleDocument } from "../role/schemas/role.schema";
import { mockUsers } from "../user/mock-users";
import { UserEntity, type UserDocument } from "../user/schemas/user.schema";

@Injectable()
export class RbacSeedService implements OnModuleInit {
  constructor(
    @InjectModel(UserEntity.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(RoleEntity.name) private readonly roleModel: Model<RoleDocument>,
    @InjectModel(PermissionEntity.name) private readonly permissionModel: Model<PermissionDocument>
  ) {}

  async onModuleInit() {
    await Promise.all([
      ...mockPermissions.map((permission) =>
        this.permissionModel.updateOne({ code: permission.code }, { $set: permission }, { upsert: true })
      ),
      ...mockRoles.map((role) => this.roleModel.updateOne({ code: role.code }, { $set: role }, { upsert: true })),
      ...mockUsers.map((user) => this.userModel.updateOne({ id: user.id }, { $set: user }, { upsert: true }))
    ]);
  }
}
