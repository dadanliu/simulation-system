import {
  Body,
  Controller,
  Post,
  Req,
  UploadedFile,
  UseInterceptors
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiBody,
  ApiConsumes,
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags
} from "@nestjs/swagger";
import type { Request } from "express";
import { CurrentUser } from "../auth/current-user.decorator";
import { ErrorResponseDto } from "../common/swagger/error-response.dto";
import { RequirePermissions } from "../permission/permissions.decorator";
import type { AuthUser } from "../user/user.types";
import { ParseProductImageFilePipe } from "./pipes/parse-product-image-file.pipe";
import { UploadService, type UploadedMemoryFile } from "./upload.service";

type UploadFileBody = {
  scene?: string;
};

@ApiTags("Upload")
@Controller("api/upload")
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post()
  @RequirePermissions("commodity:create")
  @UseInterceptors(FileInterceptor("file"))
  @ApiOperation({ summary: "上传商品图片" })
  @ApiCookieAuth("next_bff_session")
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        scene: {
          type: "string",
          description: "上传场景，可选，默认 commodity",
          example: "commodity"
        },
        file: {
          type: "string",
          format: "binary",
          description: "图片文件，仅支持 jpg/png/webp，最大 2MB"
        }
      },
      required: ["file"]
    }
  })
  @ApiResponse({ status: 200, description: "上传成功" })
  @ApiResponse({
    status: 400,
    description: "文件缺失、类型非法或超出大小限制",
    type: ErrorResponseDto
  })
  @ApiResponse({ status: 401, description: "未登录", type: ErrorResponseDto })
  @ApiResponse({
    status: 403,
    description: "无上传权限",
    type: ErrorResponseDto
  })
  @ApiResponse({
    status: 429,
    description: "上传过于频繁",
    type: ErrorResponseDto
  })
  async uploadFile(
    @Req() request: Request,
    @CurrentUser() user: AuthUser,
    @UploadedFile(ParseProductImageFilePipe) file: UploadedMemoryFile,
    @Body() body: UploadFileBody
  ) {
    return this.uploadService.uploadFile(request, user, file, body.scene);
  }
}
