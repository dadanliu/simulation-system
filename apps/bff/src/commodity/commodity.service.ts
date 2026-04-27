import { Injectable, NotFoundException } from "@nestjs/common";
import type { Request } from "express";
import { ApiClientService } from "../bff/api-client.service";
import { BffBusinessException } from "../bff/errors";
import type { AuthUser } from "../user/user.types";
import type { Commodity, CommodityListData } from "./commodity.types";
import { AuditLogService } from "./audit-log.service";
import type { CreateCommodityDto } from "./dto/create-commodity.dto";
import type { QueryCommodityListDto } from "./dto/query-commodity-list.dto";

@Injectable()
export class CommodityService {
  constructor(
    private readonly apiClientService: ApiClientService,
    private readonly auditLogService: AuditLogService
  ) {}

  listCommodities(request: Request, user: AuthUser, query: QueryCommodityListDto) {
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

    const backendPath = searchParams.size ? `/api/commodity/list?${searchParams.toString()}` : "/api/commodity/list";

    return this.apiClientService.request<CommodityListData>(request, backendPath, {
      // BFF 将已登录用户上下文注入到后端请求里。
      userId: user.id
    });
  }

  async getCommodity(request: Request, user: AuthUser, id: string) {
    // id 来自动态路由，编码后再拼接到后端路径，避免特殊字符破坏 URL。
    try {
      return await this.apiClientService.request<Commodity>(request, `/api/commodity/${encodeURIComponent(id)}`, {
        // 详情接口同样由 BFF 统一注入登录用户上下文。
        userId: user.id
      });
    } catch (error) {
      if (error instanceof BffBusinessException && error.code === 20001) {
        throw new NotFoundException("commodity not found");
      }

      throw error;
    }
  }

  createCommodity(request: Request, user: AuthUser, body: CreateCommodityDto) {
    return this.apiClientService.request<Commodity>(request, "/api/commodity/create", {
      body: {
        ...body,
        createdBy: user.id
      },
      method: "POST",
      // 创建接口同样带上当前登录用户，后端后续可用于审计和归属。
      userId: user.id
    });
  }

  async deleteCommodity(request: Request, user: AuthUser, id: string) {
    let data: Commodity;

    try {
      data = await this.apiClientService.request<Commodity>(request, `/api/commodity/${encodeURIComponent(id)}`, {
        method: "DELETE",
        userId: user.id
      });
    } catch (error) {
      if (error instanceof BffBusinessException && error.code === 20001) {
        throw new NotFoundException("commodity not found");
      }

      throw error;
    }

    const auditLog = this.auditLogService.recordCommodityDelete(user.id, id);

    return {
      auditLog,
      commodity: data
    };
  }
}
