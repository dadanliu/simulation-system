import { Injectable, NotFoundException } from "@nestjs/common";
import type { Request } from "express";
import { ApiClientService } from "../bff/api-client.service";
import { BffBusinessException } from "../bff/errors";
import type { AuthUser } from "../user/user.types";
import type { Commodity, CommodityListData } from "./commodity.types";
import { AuditLogService } from "./audit-log.service";
import { CommodityCacheService } from "./commodity-cache.service";
import type { CreateCommodityDto } from "./dto/create-commodity.dto";
import type { DeleteCommodityDto } from "./dto/delete-commodity.dto";
import type { QueryAuditLogDto } from "./dto/query-audit-log.dto";
import type { QueryCommodityListDto } from "./dto/query-commodity-list.dto";
import type { RestoreCommodityDto } from "./dto/restore-commodity.dto";
import type { UpdateCommodityDto } from "./dto/update-commodity.dto";
import type { UpdateCommodityStatusDto } from "./dto/update-commodity-status.dto";

@Injectable()
export class CommodityService {
  constructor(
    private readonly apiClientService: ApiClientService,
    private readonly auditLogService: AuditLogService,
    private readonly commodityCacheService: CommodityCacheService
  ) {}

  async listCommodities(
    request: Request,
    user: AuthUser,
    query: QueryCommodityListDto
  ) {
    const searchParams = new URLSearchParams();

    // BFF 对外暴露 minPrice / maxPrice / page / pageSize 等前端友好的字段；
    // 转发给 backend 时适配成 priceMin / priceMax / offset / limit 等内部查询协议。
    const backendQuery = {
      createdAtFrom: query.createdFrom,
      createdAtTo: query.createdTo,
      keyword: query.keyword?.trim(),
      limit: query.pageSize,
      offset: (query.page - 1) * query.pageSize,
      priceMax: query.maxPrice,
      priceMin: query.minPrice,
      sortDirection: query.sortOrder,
      sortField: query.sortBy,
      status: query.status,
      stockMax: query.maxStock,
      stockMin: query.minStock
    };

    for (const [key, value] of Object.entries(backendQuery)) {
      if (value !== undefined && value !== "") {
        searchParams.set(key, String(value));
      }
    }

    const backendPath = searchParams.size
      ? `/api/commodity/list?${searchParams.toString()}`
      : "/api/commodity/list";
    const cachedList = await this.commodityCacheService.readCommodityList(
      user,
      backendPath
    );

    if (cachedList.data && cachedList.state === "fresh") {
      return cachedList.data;
    }

    if (cachedList.data && cachedList.state === "stale") {
      void this.refreshCommodityListCache(
        request,
        user,
        backendPath,
        cachedList.key
      ).catch(() => undefined);

      return cachedList.data;
    }

    const data = await this.apiClientService.request<CommodityListData>(
      request,
      backendPath,
      {
        // BFF 将已登录用户上下文注入到后端请求里。
        userId: user.id
      }
    );
    await this.commodityCacheService.writeCommodityList(cachedList.key, data);

    return data;
  }

  async getCommodity(request: Request, user: AuthUser, id: string) {
    // id 来自动态路由，编码后再拼接到后端路径，避免特殊字符破坏 URL。
    try {
      const commodity = await this.apiClientService.request<Commodity>(
        request,
        `/api/commodity/${encodeURIComponent(id)}`,
        {
          // 详情接口同样由 BFF 统一注入登录用户上下文。
          userId: user.id
        }
      );

      return commodity;
    } catch (error) {
      if (error instanceof BffBusinessException && error.code === 20001) {
        throw new NotFoundException("commodity not found");
      }

      throw error;
    }
  }

  async createCommodity(
    request: Request & { traceId?: string },
    user: AuthUser,
    body: CreateCommodityDto
  ) {
    const commodity = await this.apiClientService.request<Commodity>(
      request,
      "/api/commodity/create",
      {
        body: {
          ...body,
          createdBy: user.id
        },
        method: "POST",
        // 创建接口同样带上当前登录用户，后端后续可用于审计和归属。
        userId: user.id
      }
    );

    const auditLog = await this.auditLogService.recordCommodityCreate(
      user.id,
      commodity,
      request.traceId ?? ""
    );
    await this.commodityCacheService.invalidateCommodityList();

    return {
      auditLog,
      commodity
    };
  }

  async deleteCommodity(
    request: Request & { traceId?: string },
    user: AuthUser,
    id: string,
    body: DeleteCommodityDto
  ) {
    let data: {
      after: Commodity;
      before: Commodity;
    };

    try {
      data = await this.apiClientService.request<{
        after: Commodity;
        before: Commodity;
      }>(request, `/api/commodity/${encodeURIComponent(id)}`, {
        body: {
          deletedBy: user.id
        },
        method: "DELETE",
        userId: user.id
      });
    } catch (error) {
      if (error instanceof BffBusinessException && error.code === 20001) {
        throw new NotFoundException("commodity not found");
      }

      throw error;
    }

    const auditLog = await this.auditLogService.recordCommodityDelete(
      user.id,
      id,
      data.before,
      data.after,
      body.reason.trim(),
      request.traceId ?? ""
    );
    await this.commodityCacheService.invalidateCommodityList();

    return {
      auditLog,
      commodity: data.after
    };
  }

  async restoreCommodity(
    request: Request & { traceId?: string },
    user: AuthUser,
    id: string,
    body: RestoreCommodityDto
  ) {
    let data: {
      after: Commodity;
      before: Commodity;
    };

    try {
      data = await this.apiClientService.request<{
        after: Commodity;
        before: Commodity;
      }>(request, `/api/commodity/${encodeURIComponent(id)}/restore`, {
        method: "PATCH",
        userId: user.id
      });
    } catch (error) {
      if (error instanceof BffBusinessException && error.code === 20001) {
        throw new NotFoundException("commodity not found");
      }

      throw error;
    }

    const auditLog = await this.auditLogService.recordCommodityRestore(
      user.id,
      id,
      data.before,
      data.after,
      body.reason.trim(),
      request.traceId ?? ""
    );
    await this.commodityCacheService.invalidateCommodityList();

    return {
      auditLog,
      commodity: data.after
    };
  }

  async updateCommodity(
    request: Request & { traceId?: string },
    user: AuthUser,
    id: string,
    body: UpdateCommodityDto
  ) {
    let data: {
      after: Commodity;
      before: Commodity;
    };

    try {
      data = await this.apiClientService.request<{
        after: Commodity;
        before: Commodity;
      }>(request, `/api/commodity/${encodeURIComponent(id)}`, {
        body: {
          ...body,
          updatedBy: user.id
        },
        method: "PATCH",
        userId: user.id
      });
    } catch (error) {
      if (error instanceof BffBusinessException && error.code === 20001) {
        throw new NotFoundException("commodity not found");
      }

      throw error;
    }

    const auditLog = await this.auditLogService.recordCommodityUpdate(
      user.id,
      id,
      data.before,
      data.after,
      request.traceId ?? ""
    );
    await this.commodityCacheService.invalidateCommodityList();

    return {
      auditLog,
      commodity: data.after
    };
  }

  listAuditLogs(query: QueryAuditLogDto) {
    return this.auditLogService.listCommodityLogs(query);
  }

  async updateCommodityStatus(
    request: Request & { traceId?: string },
    user: AuthUser,
    id: string,
    body: UpdateCommodityStatusDto
  ) {
    let data: {
      after: Commodity;
      before: Commodity;
    };

    try {
      data = await this.apiClientService.request<{
        after: Commodity;
        before: Commodity;
      }>(request, `/api/commodity/${encodeURIComponent(id)}/status`, {
        body,
        method: "PATCH",
        userId: user.id
      });
    } catch (error) {
      if (error instanceof BffBusinessException && error.code === 20001) {
        throw new NotFoundException("commodity not found");
      }

      throw error;
    }

    const auditLog = await this.auditLogService.recordCommodityStatusChange(
      user.id,
      id,
      data.before.status,
      data.after.status,
      body.reason,
      request.traceId ?? ""
    );
    await this.commodityCacheService.invalidateCommodityList();

    return {
      auditLog,
      commodity: data.after
    };
  }

  private async refreshCommodityListCache(
    request: Request,
    user: AuthUser,
    backendPath: string,
    cacheKey: string
  ) {
    const data = await this.apiClientService.request<CommodityListData>(
      request,
      backendPath,
      {
        userId: user.id
      }
    );

    await this.commodityCacheService.writeCommodityList(cacheKey, data);
  }
}
