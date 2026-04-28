import { Module, forwardRef } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { MongooseModule } from "@nestjs/mongoose";
import { PermissionsGuard } from "../permission/permissions.guard";
import { RoleModule } from "../role/role.module";
import { UserController } from "./user.controller";
import { UserEntity, UserSchema } from "./schemas/user.schema";
import { UserService } from "./user.service";

@Module({
  imports: [forwardRef(() => AuthModule), RoleModule, MongooseModule.forFeature([{ name: UserEntity.name, schema: UserSchema }])],
  controllers: [UserController],
  providers: [UserService, PermissionsGuard],
  exports: [UserService]
})
export class UserModule {}
