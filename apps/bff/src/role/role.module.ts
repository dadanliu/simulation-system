import { Module, forwardRef } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { MongooseModule } from "@nestjs/mongoose";
import { PermissionService } from "../permission/permission.service";
import { PermissionsGuard } from "../permission/permissions.guard";
import { PermissionEntity, PermissionSchema } from "../permission/schemas/permission.schema";
import { RoleController } from "./role.controller";
import { RoleService } from "./role.service";
import { RoleEntity, RoleSchema } from "./schemas/role.schema";

@Module({
  imports: [
    forwardRef(() => AuthModule),
    MongooseModule.forFeature([
      { name: RoleEntity.name, schema: RoleSchema },
      { name: PermissionEntity.name, schema: PermissionSchema }
    ])
  ],
  controllers: [RoleController],
  providers: [RoleService, PermissionService, PermissionsGuard],
  exports: [RoleService]
})
export class RoleModule {}
