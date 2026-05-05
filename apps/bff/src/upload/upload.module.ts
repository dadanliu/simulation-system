import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { BffModule } from "../bff/bff.module";
import { PermissionModule } from "../permission/permission.module";
import { RoleModule } from "../role/role.module";
import { FileController } from "./file.controller";
import { UploadController } from "./upload.controller";
import { UploadService } from "./upload.service";

@Module({
  imports: [AuthModule, BffModule, PermissionModule, RoleModule],
  controllers: [UploadController, FileController],
  providers: [UploadService]
})
export class UploadModule {}
