import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { RequestLoggingInterceptor } from "./common/interceptors/request-logging.interceptor";
import { MockBackendModule } from "./mock-backend/mock-backend.module";

@Module({
  imports: [MockBackendModule],
  controllers: [AppController],
  providers: [RequestLoggingInterceptor]
})
export class AppModule {}
