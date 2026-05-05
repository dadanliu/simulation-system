import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import {
  ApiBody,
  ApiCookieAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags
} from "@nestjs/swagger";
import type { Request } from "express";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { ErrorResponseDto } from "../common/swagger/error-response.dto";
import { RequirePermissions } from "../permission/permissions.decorator";
import { PermissionsGuard } from "../permission/permissions.guard";
import type { AuthUser } from "../user/user.types";
import { CommodityService } from "./commodity.service";
import { CreateCommodityDto } from "./dto/create-commodity.dto";
import { QueryAuditLogDto } from "./dto/query-audit-log.dto";
import { QueryCommodityListDto } from "./dto/query-commodity-list.dto";
import { UpdateCommodityDto } from "./dto/update-commodity.dto";
import { UpdateCommodityStatusDto } from "./dto/update-commodity-status.dto";
import { ParseCommodityIdPipe as CommodityIdPipe } from "./pipes/parse-commodity-id.pipe";

@ApiTags("Commodity")
@Controller("api/commodity")
@UseGuards(AuthGuard, PermissionsGuard)
export class CommodityController {
  constructor(private readonly commodityService: CommodityService) {}

  @Get("list")
  @RequirePermissions("commodity:read")
  @ApiOperation({ summary: "分页查询商品列表" })
  @ApiCookieAuth("next_bff_session")
  @ApiResponse({ status: 200, description: "商品列表查询成功" })
  @ApiResponse({ status: 400, description: "查询参数错误", type: ErrorResponseDto })
  @ApiResponse({ status: 401, description: "未登录", type: ErrorResponseDto })
  @ApiResponse({ status: 403, description: "无商品读取权限", type: ErrorResponseDto })
  async listCommodities(
    @Req() request: Request,
    @CurrentUser() user: AuthUser,
    @Query() query: QueryCommodityListDto
  ) {
    return this.commodityService.listCommodities(request, user, query);
  }

  @Get("audit-logs")
  @RequirePermissions("audit:read")
  @ApiOperation({ summary: "查询商品审计日志" })
  @ApiCookieAuth("next_bff_session")
  @ApiResponse({ status: 200, description: "审计日志查询成功" })
  @ApiResponse({ status: 400, description: "查询参数错误", type: ErrorResponseDto })
  @ApiResponse({ status: 401, description: "未登录", type: ErrorResponseDto })
  @ApiResponse({ status: 403, description: "无审计日志查看权限", type: ErrorResponseDto })
  listAuditLogs(@Query() query: QueryAuditLogDto) {
    return this.commodityService.listAuditLogs(query);
  }

  @Get(":id")
  @RequirePermissions("commodity:read")
  @ApiOperation({ summary: "查询商品详情" })
  @ApiCookieAuth("next_bff_session")
  @ApiParam({ name: "id", description: "商品ID", example: "10001" })
  @ApiResponse({ status: 200, description: "商品详情查询成功" })
  @ApiResponse({ status: 401, description: "未登录", type: ErrorResponseDto })
  @ApiResponse({ status: 403, description: "无商品读取权限", type: ErrorResponseDto })
  @ApiResponse({ status: 404, description: "商品不存在", type: ErrorResponseDto })
  async getCommodity(@Req() request: Request, @CurrentUser() user: AuthUser, @Param("id", CommodityIdPipe) id: string) {
    return this.commodityService.getCommodity(request, user, id);
  }

  @Post("create")
  @RequirePermissions("commodity:create")
  @ApiOperation({ summary: "创建商品" })
  @ApiCookieAuth("next_bff_session")
  @ApiBody({ type: CreateCommodityDto })
  @ApiResponse({ status: 200, description: "商品创建成功" })
  @ApiResponse({ status: 400, description: "参数错误或业务校验失败", type: ErrorResponseDto })
  @ApiResponse({ status: 401, description: "未登录", type: ErrorResponseDto })
  @ApiResponse({ status: 403, description: "无商品创建权限", type: ErrorResponseDto })
  async createCommodity(
    @Req() request: Request,
    @CurrentUser() user: AuthUser,
    @Body() body: CreateCommodityDto
  ) {
    return this.commodityService.createCommodity(request, user, body);
  }

  @Delete(":id")
  @RequirePermissions("commodity:delete")
  @ApiOperation({ summary: "删除商品" })
  @ApiCookieAuth("next_bff_session")
  @ApiParam({ name: "id", description: "商品ID", example: "10001" })
  @ApiResponse({ status: 200, description: "商品删除成功" })
  @ApiResponse({ status: 401, description: "未登录", type: ErrorResponseDto })
  @ApiResponse({ status: 403, description: "无商品删除权限", type: ErrorResponseDto })
  @ApiResponse({ status: 404, description: "商品不存在", type: ErrorResponseDto })
  async deleteCommodity(@Req() request: Request, @CurrentUser() user: AuthUser, @Param("id", CommodityIdPipe) id: string) {
    return this.commodityService.deleteCommodity(request, user, id);
  }

  @Patch(":id")
  @RequirePermissions("commodity:update")
  @ApiOperation({ summary: "编辑商品基础信息" })
  @ApiCookieAuth("next_bff_session")
  @ApiParam({ name: "id", description: "商品ID", example: "10001" })
  @ApiBody({ type: UpdateCommodityDto })
  @ApiResponse({ status: 200, description: "商品编辑成功" })
  @ApiResponse({ status: 400, description: "参数错误或业务校验失败", type: ErrorResponseDto })
  @ApiResponse({ status: 401, description: "未登录", type: ErrorResponseDto })
  @ApiResponse({ status: 403, description: "无商品更新权限", type: ErrorResponseDto })
  @ApiResponse({ status: 404, description: "商品不存在", type: ErrorResponseDto })
  async updateCommodity(
    @Req() request: Request,
    @CurrentUser() user: AuthUser,
    @Param("id", CommodityIdPipe) id: string,
    @Body() body: UpdateCommodityDto
  ) {
    return this.commodityService.updateCommodity(request, user, id, body);
  }

  @Patch(":id/status")
  @RequirePermissions("commodity:update")
  @ApiOperation({ summary: "变更商品状态" })
  @ApiCookieAuth("next_bff_session")
  @ApiParam({ name: "id", description: "商品ID", example: "10001" })
  @ApiBody({ type: UpdateCommodityStatusDto })
  @ApiResponse({ status: 200, description: "商品状态变更成功" })
  @ApiResponse({ status: 400, description: "参数错误或状态流转非法", type: ErrorResponseDto })
  @ApiResponse({ status: 401, description: "未登录", type: ErrorResponseDto })
  @ApiResponse({ status: 403, description: "无商品更新权限", type: ErrorResponseDto })
  @ApiResponse({ status: 404, description: "商品不存在", type: ErrorResponseDto })
  async updateCommodityStatus(
    @Req() request: Request,
    @CurrentUser() user: AuthUser,
    @Param("id", CommodityIdPipe) id: string,
    @Body() body: UpdateCommodityStatusDto
  ) {
    return this.commodityService.updateCommodityStatus(request, user, id, body);
  }
}
