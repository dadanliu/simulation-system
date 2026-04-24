import { Module } from "@nestjs/common";
import { MockBackendController } from "./mock-backend.controller";
import { MockBackendService } from "./mock-backend.service";

@Module({
  controllers: [MockBackendController],
  providers: [MockBackendService]
})
export class MockBackendModule {}
