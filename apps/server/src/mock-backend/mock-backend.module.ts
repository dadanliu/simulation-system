import { Module } from "@nestjs/common";
import { CommodityService } from "./commodity.service";
import { MockBackendController } from "./mock-backend.controller";
import { MockBackendService } from "./mock-backend.service";
import { UploadService } from "./upload.service";
import { UsersService } from "./users.service";

@Module({
  controllers: [MockBackendController],
  providers: [MockBackendService, UsersService, CommodityService, UploadService]
})
export class MockBackendModule {}
