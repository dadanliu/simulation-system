import { Body, Controller, Post, Req, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Request } from "express";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { RequirePermissions } from "../permission/permissions.decorator";
import { PermissionsGuard } from "../permission/permissions.guard";
import type { AuthUser } from "../user/user.types";
import { ParseProductImageFilePipe } from "./pipes/parse-product-image-file.pipe";
import { UploadService, type UploadedMemoryFile } from "./upload.service";

type UploadFileBody = {
  scene?: string;
};

@Controller("api/upload")
@UseGuards(AuthGuard, PermissionsGuard)
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post()
  @RequirePermissions("commodity:create")
  @UseInterceptors(FileInterceptor("file"))
  async uploadFile(
    @Req() request: Request,
    @CurrentUser() user: AuthUser,
    @UploadedFile(ParseProductImageFilePipe) file: UploadedMemoryFile,
    @Body() body: UploadFileBody
  ) {
    return this.uploadService.uploadFile(request, user, file, body.scene);
  }
}
