import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import {
  CommodityService,
  type CreateCommodityBody,
  type ListCommoditiesQuery,
  type UpdateCommodityBody,
  type UpdateCommodityStatusBody
} from "./commodity.service";
import { MockBackendService } from "./mock-backend.service";
import { FileRegistryService } from "./storage/file-registry.service";
import { UploadService, type UploadedMemoryFile } from "./upload.service";
import { UsersService } from "./users.service";

type CreateUploadTokenBody = {
  filename?: string;
};

type UploadFileBody = {
  scene?: string;
};

type DeleteCommodityBody = {
  deletedBy?: string;
};

@Controller("api")
export class MockBackendController {
  constructor(
    private readonly mockBackendService: MockBackendService,
    private readonly usersService: UsersService,
    private readonly commodityService: CommodityService,
    private readonly uploadService: UploadService,
    private readonly fileRegistryService: FileRegistryService,
    private readonly configService: ConfigService
  ) {}

  @Get("health")
  getHealth() {
    return this.mockBackendService.getHealth();
  }

  @Get("users")
  getUsers() {
    return this.usersService.listUsers();
  }

  @Get("users/:id")
  getUser(@Param("id") id: string) {
    return this.usersService.getUserById(id);
  }

  @Get("commodity/list")
  getCommodities(@Query() query: ListCommoditiesQuery) {
    return this.commodityService.listCommodities(query);
  }

  @Get("commodity/:id")
  getCommodity(@Param("id") id: string) {
    // mock backend 只负责返回统一 errno 结构，是否转成 HTTP 异常由 BFF 决定。
    return this.commodityService.getCommodityById(id);
  }

  @Post("commodity/create")
  createCommodity(@Body() body: CreateCommodityBody) {
    return this.commodityService.createCommodity(body);
  }

  @Delete("commodity/:id")
  deleteCommodity(@Param("id") id: string, @Body() body: DeleteCommodityBody) {
    return this.commodityService.deleteCommodity(id, body.deletedBy);
  }

  @Patch("commodity/:id")
  updateCommodity(@Param("id") id: string, @Body() body: UpdateCommodityBody) {
    return this.commodityService.updateCommodity(id, body);
  }

  @Patch("commodity/:id/restore")
  restoreCommodity(@Param("id") id: string) {
    return this.commodityService.restoreCommodity(id);
  }

  @Patch("commodity/:id/status")
  updateCommodityStatus(
    @Param("id") id: string,
    @Body() body: UpdateCommodityStatusBody
  ) {
    return this.commodityService.updateCommodityStatus(id, body);
  }

  @Post("upload/token")
  createUploadToken(@Body() body: CreateUploadTokenBody) {
    return this.uploadService.createUploadToken(body.filename);
  }

  @Post("upload")
  @UseInterceptors(FileInterceptor("file"))
  uploadFile(
    @UploadedFile() file: UploadedMemoryFile | undefined,
    @Body() body: UploadFileBody
  ) {
    return this.uploadService.uploadFile(file, body.scene);
  }

  @Get("files/:fileId")
  async getFile(@Param("fileId") fileId: string, @Res() response: Response) {
    const access = await this.uploadService.getFileAccess(fileId);

    if (!access?.body) {
      throw new NotFoundException("file not found");
    }

    response.setHeader("Cache-Control", "private, no-store");
    response.setHeader("Content-Type", access.mimeType);
    response.send(access.body);
  }

  @Post("test/reset")
  async resetForTest() {
    if (!this.isTestResetEnabled()) {
      throw new NotFoundException("not found");
    }

    await this.commodityService.resetForTest();
    this.fileRegistryService.clear();

    return {
      success: true,
      message: "mock backend test data reset"
    };
  }

  private isTestResetEnabled() {
    return (
      this.configService.get<string>("APP_ENV") === "test" ||
      this.configService.get<string>("E2E_TEST_RESET_ENABLED") === "true"
    );
  }
}
