import { Module, forwardRef } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { MongooseModule } from "@nestjs/mongoose";
import { PermissionService } from "../permission/permission.service";
import { PermissionsGuard } from "../permission/permissions.guard";
import { PermissionEntity, PermissionSchema } from "../permission/schemas/permission.schema";
import { RoleModule } from "../role/role.module";
import { RoleEntity, RoleSchema } from "../role/schemas/role.schema";
import { UserController } from "./user.controller";
import { UserEntity, UserSchema } from "./schemas/user.schema";
import { UserService } from "./user.service";

@Module({
  imports: [
    forwardRef(() => AuthModule),
    RoleModule,
    MongooseModule.forFeature([
      { name: UserEntity.name, schema: UserSchema },
      { name: RoleEntity.name, schema: RoleSchema },
      { name: PermissionEntity.name, schema: PermissionSchema }
    ])
  ],
  controllers: [UserController],
  providers: [UserService, PermissionService, PermissionsGuard],
  exports: [UserService]
})
export class UserModule {}
