import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { CommodityService } from "./commodity.service";
import { MockBackendService } from "./mock-backend.service";
import { UploadService } from "./upload.service";
import { UsersService } from "./users.service";

type CreateUploadTokenBody = {
  filename?: string;
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
  getCommodities() {
    return this.commodityService.listCommodities();
  }

  @Get("commodity/:id")
  getCommodity(@Param("id") id: string) {
    return this.commodityService.getCommodityById(id);
  }

  @Post("upload/token")
  createUploadToken(@Body() body: CreateUploadTokenBody) {
    return this.uploadService.createUploadToken(body.filename);
  }
}
