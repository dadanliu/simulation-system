import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { ScheduleModule } from "@nestjs/schedule";
import { AppController } from "./app.controller";
import { AuthModule } from "./auth/auth.module";
import { BffModule } from "./bff/bff.module";
import { CommodityModule } from "./commodity/commodity.module";
import { bffConfigModuleOptions } from "./config/env";
import { RequestLoggingInterceptor } from "./common/interceptors/request-logging.interceptor";
import { SuccessResponseInterceptor } from "./common/interceptors/success-response.interceptor";
import { DatabaseModule } from "./database/database.module";
import { HealthModule } from "./health/health.module";
import { PermissionModule } from "./permission/permission.module";
import { QueueModule } from "./queue/queue.module";
import { RateLimitModule } from "./rate-limit/rate-limit.module";
import { RoleModule } from "./role/role.module";
import { TestResetModule } from "./test-support/test-reset.module";
import { UploadModule } from "./upload/upload.module";
import { UserModule } from "./user/user.module";

@Module({
  imports: [
    ConfigModule.forRoot(bffConfigModuleOptions),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    AuthModule,
    BffModule,
    CommodityModule,
    DatabaseModule,
    HealthModule,
    PermissionModule,
    QueueModule,
    RateLimitModule,
    RoleModule,
    TestResetModule,
    UploadModule,
    UserModule
  ],
  controllers: [AppController],
  providers: [RequestLoggingInterceptor, SuccessResponseInterceptor]
})
export class AppModule {}
