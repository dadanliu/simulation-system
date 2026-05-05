import { Controller, Get, Param, Req, Res, UseGuards } from "@nestjs/common";
import { ApiCookieAuth, ApiExcludeEndpoint } from "@nestjs/swagger";
import type { Request, Response } from "express";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import type { AuthUser } from "../user/user.types";
import { UploadService } from "./upload.service";

@Controller("api/files")
@UseGuards(AuthGuard)
export class FileController {
  constructor(private readonly uploadService: UploadService) {}

  @Get(":fileId")
  @ApiExcludeEndpoint()
  @ApiCookieAuth("next_bff_session")
  async getFile(@Req() request: Request, @CurrentUser() user: AuthUser, @Param("fileId") fileId: string, @Res() response: Response) {
    const upstreamResponse = await this.uploadService.getFile(request, user, fileId);
    const arrayBuffer = await upstreamResponse.arrayBuffer();

    response.status(upstreamResponse.status);
    response.setHeader("Cache-Control", "private, no-store");
    response.setHeader("Content-Type", upstreamResponse.headers.get("content-type") ?? "application/octet-stream");
    response.send(Buffer.from(arrayBuffer));
  }
}
