import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { RoleModule } from "../role/role.module";
import { PermissionController } from "./permission.controller";
import { PermissionsGuard } from "./permissions.guard";
import { PermissionService } from "./permission.service";

@Module({
  imports: [AuthModule, RoleModule],
  controllers: [PermissionController],
  providers: [PermissionService, PermissionsGuard],
  exports: [PermissionService, PermissionsGuard]
})
export class PermissionModule {}
