import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { RequirePermissions } from "../permission/permissions.decorator";
import { PermissionsGuard } from "../permission/permissions.guard";
import type { AuthUser } from "../user/user.types";
import { CommodityService } from "./commodity.service";
import { CreateCommodityDto } from "./dto/create-commodity.dto";
import { QueryAuditLogDto } from "./dto/query-audit-log.dto";
import { QueryCommodityListDto } from "./dto/query-commodity-list.dto";
import { UpdateCommodityStatusDto } from "./dto/update-commodity-status.dto";
import { ParseCommodityIdPipe as CommodityIdPipe } from "./pipes/parse-commodity-id.pipe";

@Controller("api/commodity")
@UseGuards(AuthGuard, PermissionsGuard)
export class CommodityController {
  constructor(private readonly commodityService: CommodityService) {}

  @Get("list")
  @RequirePermissions("commodity:read")
  async listCommodities(
    @Req() request: Request,
    @CurrentUser() user: AuthUser,
    @Query() query: QueryCommodityListDto
  ) {
    return this.commodityService.listCommodities(request, user, query);
  }

  @Get("audit-logs")
  @RequirePermissions("audit:read")
  listAuditLogs(@Query() query: QueryAuditLogDto) {
    return this.commodityService.listAuditLogs(query);
  }

  @Get(":id")
  @RequirePermissions("commodity:read")
  async getCommodity(@Req() request: Request, @CurrentUser() user: AuthUser, @Param("id", CommodityIdPipe) id: string) {
    return this.commodityService.getCommodity(request, user, id);
  }

  @Post("create")
  @RequirePermissions("commodity:create")
  async createCommodity(
    @Req() request: Request,
    @CurrentUser() user: AuthUser,
    @Body() body: CreateCommodityDto
  ) {
    return this.commodityService.createCommodity(request, user, body);
  }

  @Delete(":id")
  @RequirePermissions("commodity:delete")
  async deleteCommodity(@Req() request: Request, @CurrentUser() user: AuthUser, @Param("id", CommodityIdPipe) id: string) {
    return this.commodityService.deleteCommodity(request, user, id);
  }

  @Patch(":id/status")
  @RequirePermissions("commodity:update")
  async updateCommodityStatus(
    @Req() request: Request,
    @CurrentUser() user: AuthUser,
    @Param("id", CommodityIdPipe) id: string,
    @Body() body: UpdateCommodityStatusDto
  ) {
    return this.commodityService.updateCommodityStatus(request, user, id, body);
  }
}
