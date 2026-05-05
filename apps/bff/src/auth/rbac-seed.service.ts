import { Injectable, type OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { mockPermissions } from "../permission/mock-permissions";
import { PermissionEntity, type PermissionDocument } from "../permission/schemas/permission.schema";
import { mockRoles } from "../role/mock-roles";
import { RoleEntity, type RoleDocument } from "../role/schemas/role.schema";
import { mockUsers } from "../user/mock-users";
import { hashPassword } from "../user/password-hash";
import { UserEntity, type UserDocument } from "../user/schemas/user.schema";

@Injectable()
export class RbacSeedService implements OnModuleInit {
  constructor(
    @InjectModel(UserEntity.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(RoleEntity.name) private readonly roleModel: Model<RoleDocument>,
    @InjectModel(PermissionEntity.name) private readonly permissionModel: Model<PermissionDocument>,
    private readonly configService: ConfigService
  ) {}

  async onModuleInit() {
    if (!this.shouldRunMockSeed()) {
      return;
    }

    await this.migrateLegacyPlaintextPasswords();

    const seededUsers = await Promise.all(
      mockUsers.map(async (user) => {
        const { password, ...userData } = user;

        return {
          ...userData,
          passwordHash: await hashPassword(password)
        };
      })
    );

    await Promise.all([
      ...mockPermissions.map((permission) =>
        this.permissionModel.updateOne({ code: permission.code }, { $set: permission }, { upsert: true })
      ),
      ...mockRoles.map((role) => this.roleModel.updateOne({ code: role.code }, { $set: role }, { upsert: true })),
      ...seededUsers.map((user) =>
        this.userModel.updateOne({ id: user.id }, { $set: user, $unset: { password: "" } }, { upsert: true })
      )
    ]);
  }

  private shouldRunMockSeed() {
    const appEnv = this.configService.get<string>("APP_ENV", "development");
    const enabled = this.configService.get<string>("MOCK_SEED_ENABLED");

    if (appEnv === "production") {
      return false;
    }

    if (enabled !== undefined) {
      return enabled === "true";
    }

    return true;
  }

  private async migrateLegacyPlaintextPasswords() {
    const legacyUsers = await this.userModel
      .find({ password: { $exists: true, $type: "string" } })
      .select({ id: 1, password: 1 })
      .lean<Array<{ id: string; password: string }>>();

    await Promise.all(
      legacyUsers.map(async (user) =>
        this.userModel.updateOne(
          { id: user.id },
          { $set: { passwordHash: await hashPassword(user.password) }, $unset: { password: "" } }
        )
      )
    );
  }
}
