import { Module, forwardRef } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PermissionService } from "../permission/permission.service";
import { PermissionsGuard } from "../permission/permissions.guard";
import { RoleController } from "./role.controller";
import { RoleService } from "./role.service";

@Module({
  imports: [forwardRef(() => AuthModule)],
  controllers: [RoleController],
  providers: [RoleService, PermissionService, PermissionsGuard],
  exports: [RoleService]
})
export class RoleModule {}
