import { Module, forwardRef } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { PermissionEntity, PermissionSchema } from "../permission/schemas/permission.schema";
import { RoleEntity, RoleSchema } from "../role/schemas/role.schema";
import { UserModule } from "../user/user.module";
import { UserEntity, UserSchema } from "../user/schemas/user.schema";
import { AuthController } from "./auth.controller";
import { AuthGuard } from "./auth.guard";
import { AuthService } from "./auth.service";
import { GetCurrentUserService } from "./get-current-user";
import { RbacSeedService } from "./rbac-seed.service";
import { SessionStoreService } from "./session-store.service";

@Module({
  imports: [
    forwardRef(() => UserModule),
    MongooseModule.forFeature([
      { name: UserEntity.name, schema: UserSchema },
      { name: RoleEntity.name, schema: RoleSchema },
      { name: PermissionEntity.name, schema: PermissionSchema }
    ])
  ],
  controllers: [AuthController],
  providers: [AuthService, SessionStoreService, GetCurrentUserService, AuthGuard, RbacSeedService],
  exports: [GetCurrentUserService, AuthGuard]
})
export class AuthModule {}
