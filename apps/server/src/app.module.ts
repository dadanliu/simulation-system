import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { MockBackendModule } from "./mock-backend/mock-backend.module";

@Module({
  imports: [MockBackendModule],
  controllers: [AppController]
})
export class AppModule {}
