import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards
} from "@nestjs/common";
import {
  ApiBody,
  ApiCookieAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags
} from "@nestjs/swagger";
import type { Request, Response } from "express";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { ErrorResponseDto } from "../common/swagger/error-response.dto";
import { RequirePermissions } from "../permission/permissions.decorator";
import { PermissionsGuard } from "../permission/permissions.guard";
import type { AuthUser } from "../user/user.types";
import {
  CommodityService,
  type CommodityListCacheDebug
} from "./commodity.service";
import { CreateCommodityDto } from "./dto/create-commodity.dto";
import { DeleteCommodityDto } from "./dto/delete-commodity.dto";
import { QueryAuditLogDto } from "./dto/query-audit-log.dto";
import { QueryCommodityListDto } from "./dto/query-commodity-list.dto";
import { RestoreCommodityDto } from "./dto/restore-commodity.dto";
import { UpdateCommodityDto } from "./dto/update-commodity.dto";
import { UpdateCommodityStatusDto } from "./dto/update-commodity-status.dto";
import { ParseCommodityIdPipe as CommodityIdPipe } from "./pipes/parse-commodity-id.pipe";

type RequestWithCommodityListCacheDebug = Request & {
  commodityListCacheDebug?: CommodityListCacheDebug;
};

function setCommodityListCacheHeaders(request: Request, response: Response) {
  const cacheDebug = (request as RequestWithCommodityListCacheDebug)
    .commodityListCacheDebug;

  response.setHeader("Cache-Control", "no-store");
  response.setHeader("X-Cache-Layer", "bff-redis");

  if (!cacheDebug) {
    return;
  }

  response.setHeader("X-Commodity-List-Cache-State", cacheDebug.state);
  response.setHeader("X-Commodity-List-Cache-Source", cacheDebug.source);
  response.setHeader("X-Commodity-List-Cache-Refresh", cacheDebug.refresh);
  response.setHeader("X-Commodity-List-Cache-Key", cacheDebug.keyHash);
}

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
  @ApiResponse({
    status: 400,
    description: "查询参数错误",
    type: ErrorResponseDto
  })
  @ApiResponse({ status: 401, description: "未登录", type: ErrorResponseDto })
  @ApiResponse({
    status: 403,
    description: "无商品读取权限",
    type: ErrorResponseDto
  })
  async listCommodities(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @CurrentUser() user: AuthUser,
    @Query() query: QueryCommodityListDto
  ) {
    const data = await this.commodityService.listCommodities(
      request,
      user,
      query
    );

    setCommodityListCacheHeaders(request, response);

    return data;
  }

  @Get("audit-logs")
  @RequirePermissions("audit:read")
  @ApiOperation({ summary: "查询商品审计日志" })
  @ApiCookieAuth("next_bff_session")
  @ApiResponse({ status: 200, description: "审计日志查询成功" })
  @ApiResponse({
    status: 400,
    description: "查询参数错误",
    type: ErrorResponseDto
  })
  @ApiResponse({ status: 401, description: "未登录", type: ErrorResponseDto })
  @ApiResponse({
    status: 403,
    description: "无审计日志查看权限",
    type: ErrorResponseDto
  })
  listAuditLogs(
    @CurrentUser() user: AuthUser,
    @Query() query: QueryAuditLogDto
  ) {
    if (!user.roles.includes("admin")) {
      throw new ForbiddenException("permission denied");
    }

    if (
      query.createdFrom &&
      query.createdTo &&
      new Date(query.createdFrom) > new Date(query.createdTo)
    ) {
      throw new BadRequestException(
        "createdFrom must be before or equal to createdTo"
      );
    }

    return this.commodityService.listAuditLogs(query);
  }

  @Get(":id")
  @RequirePermissions("commodity:read")
  @ApiOperation({ summary: "查询商品详情" })
  @ApiCookieAuth("next_bff_session")
  @ApiParam({ name: "id", description: "商品ID", example: "10001" })
  @ApiResponse({ status: 200, description: "商品详情查询成功" })
  @ApiResponse({ status: 401, description: "未登录", type: ErrorResponseDto })
  @ApiResponse({
    status: 403,
    description: "无商品读取权限",
    type: ErrorResponseDto
  })
  @ApiResponse({
    status: 404,
    description: "商品不存在",
    type: ErrorResponseDto
  })
  async getCommodity(
    @Req() request: Request,
    @CurrentUser() user: AuthUser,
    @Param("id", CommodityIdPipe) id: string
  ) {
    return this.commodityService.getCommodity(request, user, id);
  }

  @Post("create")
  @RequirePermissions("commodity:create")
  @ApiOperation({ summary: "创建商品" })
  @ApiCookieAuth("next_bff_session")
  @ApiBody({ type: CreateCommodityDto })
  @ApiResponse({ status: 200, description: "商品创建成功" })
  @ApiResponse({
    status: 400,
    description: "参数错误或业务校验失败",
    type: ErrorResponseDto
  })
  @ApiResponse({ status: 401, description: "未登录", type: ErrorResponseDto })
  @ApiResponse({
    status: 403,
    description: "无商品创建权限",
    type: ErrorResponseDto
  })
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
  @ApiResponse({
    status: 403,
    description: "无商品删除权限",
    type: ErrorResponseDto
  })
  @ApiResponse({
    status: 404,
    description: "商品不存在",
    type: ErrorResponseDto
  })
  async deleteCommodity(
    @Req() request: Request,
    @CurrentUser() user: AuthUser,
    @Param("id", CommodityIdPipe) id: string,
    @Body() body: DeleteCommodityDto
  ) {
    return this.commodityService.deleteCommodity(request, user, id, body);
  }

  @Patch(":id/restore")
  @RequirePermissions("commodity:delete")
  @ApiOperation({ summary: "恢复已删除商品" })
  @ApiCookieAuth("next_bff_session")
  @ApiParam({ name: "id", description: "商品ID", example: "10001" })
  @ApiResponse({ status: 200, description: "商品恢复成功" })
  @ApiResponse({ status: 401, description: "未登录", type: ErrorResponseDto })
  @ApiResponse({
    status: 403,
    description: "无商品删除/恢复权限",
    type: ErrorResponseDto
  })
  @ApiResponse({
    status: 404,
    description: "商品不存在或未删除",
    type: ErrorResponseDto
  })
  async restoreCommodity(
    @Req() request: Request,
    @CurrentUser() user: AuthUser,
    @Param("id", CommodityIdPipe) id: string,
    @Body() body: RestoreCommodityDto
  ) {
    return this.commodityService.restoreCommodity(request, user, id, body);
  }

  @Patch(":id")
  @RequirePermissions("commodity:update")
  @ApiOperation({ summary: "编辑商品基础信息" })
  @ApiCookieAuth("next_bff_session")
  @ApiParam({ name: "id", description: "商品ID", example: "10001" })
  @ApiBody({ type: UpdateCommodityDto })
  @ApiResponse({ status: 200, description: "商品编辑成功" })
  @ApiResponse({
    status: 400,
    description: "参数错误或业务校验失败",
    type: ErrorResponseDto
  })
  @ApiResponse({ status: 401, description: "未登录", type: ErrorResponseDto })
  @ApiResponse({
    status: 403,
    description: "无商品更新权限",
    type: ErrorResponseDto
  })
  @ApiResponse({
    status: 404,
    description: "商品不存在",
    type: ErrorResponseDto
  })
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
  @ApiResponse({
    status: 400,
    description: "参数错误或状态流转非法",
    type: ErrorResponseDto
  })
  @ApiResponse({ status: 401, description: "未登录", type: ErrorResponseDto })
  @ApiResponse({
    status: 403,
    description: "无商品更新权限",
    type: ErrorResponseDto
  })
  @ApiResponse({
    status: 404,
    description: "商品不存在",
    type: ErrorResponseDto
  })
  async updateCommodityStatus(
    @Req() request: Request,
    @CurrentUser() user: AuthUser,
    @Param("id", CommodityIdPipe) id: string,
    @Body() body: UpdateCommodityStatusDto
  ) {
    return this.commodityService.updateCommodityStatus(request, user, id, body);
  }
}
