import { Module, forwardRef } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PermissionsGuard } from "../permission/permissions.guard";
import { RoleController } from "./role.controller";
import { RoleService } from "./role.service";

@Module({
  imports: [forwardRef(() => AuthModule)],
  controllers: [RoleController],
  providers: [RoleService, PermissionsGuard],
  exports: [RoleService]
})
export class RoleModule {}
