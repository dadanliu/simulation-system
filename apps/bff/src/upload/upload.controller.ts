import { Body, Controller, Post, Req, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Request } from "express";
import { UploadService, type UploadedMemoryFile } from "./upload.service";

type UploadFileBody = {
  scene?: string;
};

@Controller("api/upload")
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post()
  @UseInterceptors(FileInterceptor("file"))
  async uploadFile(@Req() request: Request, @UploadedFile() file: UploadedMemoryFile | undefined, @Body() body: UploadFileBody) {
    const data = await this.uploadService.uploadFile(request, file, body.scene);

    return {
      success: true,
      data
    };
  }
}
