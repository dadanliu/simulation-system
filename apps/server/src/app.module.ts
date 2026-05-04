import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AppController } from "./app.controller";
import { serverConfigModuleOptions } from "./config/env";
import { RequestLoggingInterceptor } from "./common/interceptors/request-logging.interceptor";
import { DatabaseModule } from "./database/database.module";
import { MockBackendModule } from "./mock-backend/mock-backend.module";

@Module({
  imports: [ConfigModule.forRoot(serverConfigModuleOptions), DatabaseModule, MockBackendModule],
  controllers: [AppController],
  providers: [RequestLoggingInterceptor]
})
export class AppModule {}
