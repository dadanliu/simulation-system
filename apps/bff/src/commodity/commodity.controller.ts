import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import type { AuthUser } from "../auth/mock-users";
import { CommodityService } from "./commodity.service";
import type { CommodityListQuery, CreateCommodityBody } from "./commodity.types";

@Controller("api/commodity")
@UseGuards(AuthGuard)
export class CommodityController {
  constructor(private readonly commodityService: CommodityService) {}

  @Get("list")
  async listCommodities(
    @Req() request: Request,
    @CurrentUser() user: AuthUser,
    @Query() query: CommodityListQuery
  ) {
    const data = await this.commodityService.listCommodities(request, user, query);

    return {
      success: true,
      data
    };
  }

  @Get(":id")
  async getCommodity(@Req() request: Request, @CurrentUser() user: AuthUser, @Param("id") id: string) {
    const data = await this.commodityService.getCommodity(request, user, id);

    return {
      success: true,
      data
    };
  }

  @Post("create")
  async createCommodity(
    @Req() request: Request,
    @CurrentUser() user: AuthUser,
    @Body() body: CreateCommodityBody
  ) {
    const data = await this.commodityService.createCommodity(request, user, body);

    return {
      success: true,
      data
    };
  }
}
