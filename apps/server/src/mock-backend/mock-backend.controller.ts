import { Body, Controller, Get, Param, Post, Query, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { CommodityService, type CreateCommodityBody, type ListCommoditiesQuery } from "./commodity.service";
import { MockBackendService } from "./mock-backend.service";
import { UploadService, type UploadedMemoryFile } from "./upload.service";
import { UsersService } from "./users.service";

type CreateUploadTokenBody = {
  filename?: string;
};

type UploadFileBody = {
  scene?: string;
};

@Controller("api")
export class MockBackendController {
  constructor(
    private readonly mockBackendService: MockBackendService,
    private readonly usersService: UsersService,
    private readonly commodityService: CommodityService,
    private readonly uploadService: UploadService
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

  @Post("upload/token")
  createUploadToken(@Body() body: CreateUploadTokenBody) {
    return this.uploadService.createUploadToken(body.filename);
  }

  @Post("upload")
  @UseInterceptors(FileInterceptor("file"))
  uploadFile(@UploadedFile() file: UploadedMemoryFile | undefined, @Body() body: UploadFileBody) {
    return this.uploadService.uploadFile(file, body.scene);
  }
}
