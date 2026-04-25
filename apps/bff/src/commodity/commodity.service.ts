import { Injectable } from "@nestjs/common";
import type { Request } from "express";
import { RequireLoginService } from "../auth/require-login";
import { ApiClientService } from "../bff/api-client.service";
import type { Commodity, CommodityListData, CommodityListQuery } from "./commodity.types";

@Injectable()
export class CommodityService {
  constructor(
    private readonly apiClientService: ApiClientService,
    private readonly requireLoginService: RequireLoginService
  ) {}

  listCommodities(request: Request, query: CommodityListQuery) {
    const user = this.requireLoginService.execute(request);
    const searchParams = new URLSearchParams();

    // 只转发明确传入的查询参数，默认值交给 mock backend 处理。
    for (const [key, value] of Object.entries(query)) {
      if (typeof value === "string" && value.trim()) {
        searchParams.set(key, value.trim());
      }
    }

    const backendPath = searchParams.size ? `/api/commodity/list?${searchParams.toString()}` : "/api/commodity/list";

    return this.apiClientService.request<CommodityListData>(request, backendPath, {
      // BFF 将已登录用户上下文注入到后端请求里。
      userId: user.id
    });
  }

  getCommodity(request: Request, id: string) {
    const user = this.requireLoginService.execute(request);

    // id 来自动态路由，编码后再拼接到后端路径，避免特殊字符破坏 URL。
    return this.apiClientService.request<Commodity>(request, `/api/commodity/${encodeURIComponent(id)}`, {
      // 详情接口同样由 BFF 统一注入登录用户上下文。
      userId: user.id
    });
  }
}
