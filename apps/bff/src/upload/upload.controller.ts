import { Body, Controller, Post, Req, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Request } from "express";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import type { AuthUser } from "../auth/mock-users";
import { UploadService, type UploadedMemoryFile } from "./upload.service";

type UploadFileBody = {
  scene?: string;
};

@Controller("api/upload")
@UseGuards(AuthGuard)
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post()
  @UseInterceptors(FileInterceptor("file"))
  async uploadFile(
    @Req() request: Request,
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: UploadedMemoryFile | undefined,
    @Body() body: UploadFileBody
  ) {
    const data = await this.uploadService.uploadFile(request, user, file, body.scene);

    return {
      success: true,
      data
    };
  }
}
