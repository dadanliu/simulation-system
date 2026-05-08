import { serverApiRequest } from "@/src/lib/server-api";
import type {
  AuditLogListData,
  Commodity,
  CommodityListData,
  CommodityListPageData
} from "@/src/features/commodity/types";
import {
  buildCommodityListRequestSearchParams,
  readCommodityListFilters,
  type CommoditySearchParams
} from "@/src/features/commodity/query";

export async function getCommodityListPageData(searchParams: CommoditySearchParams): Promise<CommodityListPageData> {
  const filters = readCommodityListFilters(searchParams);
  const query = buildCommodityListRequestSearchParams(searchParams);
  const nextPath = query.toString() ? `/present/commodity/list?${query.toString()}` : "/present/commodity/list";
  const { data } = await serverApiRequest<CommodityListData>(`/api/commodity/list?${query.toString()}`, {
    fallbackMessage: "商品列表加载失败",
    nextPathOnUnauthorized: nextPath
  });

  return {
    ...data,
    filters,
    totalPages: Math.max(1, Math.ceil(data.pagination.total / data.pagination.pageSize))
  };
}

export async function getCommodityDetail(id: string) {
  const { data } = await serverApiRequest<Commodity>(`/api/commodity/${encodeURIComponent(id)}`, {
    fallbackMessage: "商品详情加载失败",
    nextPathOnUnauthorized: `/present/commodity/${encodeURIComponent(id)}`,
    onNotFound: "notFound"
  });

  return data;
}

export async function getCommodityAuditLogs(searchParams: {
  action?: string | string[];
  operator?: string | string[];
  page?: string | string[];
  pageSize?: string | string[];
}) {
  const query = new URLSearchParams();
  const operator = Array.isArray(searchParams.operator) ? searchParams.operator[0] : searchParams.operator;
  const action = Array.isArray(searchParams.action) ? searchParams.action[0] : searchParams.action;
  const page = Array.isArray(searchParams.page) ? searchParams.page[0] : searchParams.page;
  const pageSize = Array.isArray(searchParams.pageSize) ? searchParams.pageSize[0] : searchParams.pageSize;

  if (operator) {
    query.set("operator", operator);
  }

  if (action) {
    query.set("action", action);
  }

  if (page) {
    query.set("page", page);
  }

  if (pageSize) {
    query.set("pageSize", pageSize);
  }

  const nextPath = query.toString() ? `/present/commodity/audit?${query.toString()}` : "/present/commodity/audit";
  const { data } = await serverApiRequest<AuditLogListData>(`/api/commodity/audit-logs?${query.toString()}`, {
    fallbackMessage: "审计日志加载失败",
    nextPathOnUnauthorized: nextPath
  });

  return data;
}
