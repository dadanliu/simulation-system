import { Module, forwardRef } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PermissionsGuard } from "../permission/permissions.guard";
import { RoleModule } from "../role/role.module";
import { UserController } from "./user.controller";
import { UserService } from "./user.service";

@Module({
  imports: [forwardRef(() => AuthModule), RoleModule],
  controllers: [UserController],
  providers: [UserService, PermissionsGuard],
  exports: [UserService]
})
export class UserModule {}
