import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AuthModule } from "./auth/auth.module";
import { BffModule } from "./bff/bff.module";
import { CommodityModule } from "./commodity/commodity.module";
import { PermissionModule } from "./permission/permission.module";
import { RoleModule } from "./role/role.module";
import { UploadModule } from "./upload/upload.module";
import { UserModule } from "./user/user.module";

@Module({
  imports: [AuthModule, BffModule, CommodityModule, PermissionModule, RoleModule, UploadModule, UserModule],
  controllers: [AppController]
})
export class AppModule {}
