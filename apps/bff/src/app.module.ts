import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AuthModule } from "./auth/auth.module";
import { BffModule } from "./bff/bff.module";
import { CommodityModule } from "./commodity/commodity.module";
import { RequestLoggingInterceptor } from "./common/interceptors/request-logging.interceptor";
import { SuccessResponseInterceptor } from "./common/interceptors/success-response.interceptor";
import { PermissionModule } from "./permission/permission.module";
import { RoleModule } from "./role/role.module";
import { UploadModule } from "./upload/upload.module";
import { UserModule } from "./user/user.module";

@Module({
  imports: [AuthModule, BffModule, CommodityModule, PermissionModule, RoleModule, UploadModule, UserModule],
  controllers: [AppController],
  providers: [RequestLoggingInterceptor, SuccessResponseInterceptor]
})
export class AppModule {}
