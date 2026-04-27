import { Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { RequirePermissions } from "../permission/permissions.decorator";
import { PermissionsGuard } from "../permission/permissions.guard";
import type { AuthUser } from "../user/user.types";
import { CommodityService } from "./commodity.service";
import type { CommodityListQuery, CreateCommodityBody } from "./commodity.types";

@Controller("api/commodity")
@UseGuards(AuthGuard, PermissionsGuard)
export class CommodityController {
  constructor(private readonly commodityService: CommodityService) {}

  @Get("list")
  @RequirePermissions("commodity:read")
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
  @RequirePermissions("commodity:read")
  async getCommodity(@Req() request: Request, @CurrentUser() user: AuthUser, @Param("id") id: string) {
    const data = await this.commodityService.getCommodity(request, user, id);

    return {
      success: true,
      data
    };
  }

  @Post("create")
  @RequirePermissions("commodity:create")
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

  @Delete(":id")
  @RequirePermissions("commodity:delete")
  async deleteCommodity(@Req() request: Request, @CurrentUser() user: AuthUser, @Param("id") id: string) {
    const data = await this.commodityService.deleteCommodity(request, user, id);

    return {
      success: true,
      data
    };
  }
}
