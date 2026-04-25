import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { BffModule } from "../bff/bff.module";
import { UploadController } from "./upload.controller";
import { UploadService } from "./upload.service";

@Module({
  imports: [AuthModule, BffModule],
  controllers: [UploadController],
  providers: [UploadService]
})
export class UploadModule {}
