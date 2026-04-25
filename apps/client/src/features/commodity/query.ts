import type { CommodityListFilters, CommodityStatus } from "@/src/features/commodity/types";

type SearchParamValue = string | string[] | undefined;

export type CommoditySearchParams = Record<string, SearchParamValue>;

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;
const VALID_STATUSES = new Set<CommodityStatus>(["on_sale", "pending", "offline"]);

function firstSearchParam(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

function parsePositiveInteger(value: SearchParamValue, fallback: number) {
  const parsed = Number(firstSearchParam(value));
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function parseStatus(value: SearchParamValue): CommodityStatus | "" {
  const status = firstSearchParam(value);
  return status && VALID_STATUSES.has(status as CommodityStatus) ? (status as CommodityStatus) : "";
}

export function readCommodityListFilters(searchParams: CommoditySearchParams): CommodityListFilters {
  return {
    keyword: firstSearchParam(searchParams.keyword)?.trim() ?? "",
    page: parsePositiveInteger(searchParams.page, DEFAULT_PAGE),
    pageSize: parsePositiveInteger(searchParams.pageSize, DEFAULT_PAGE_SIZE),
    status: parseStatus(searchParams.status)
  };
}

export function buildCommodityListSearchParams(filters: CommodityListFilters) {
  const query = new URLSearchParams();

  query.set("page", String(filters.page));
  query.set("pageSize", String(filters.pageSize));

  if (filters.keyword) {
    query.set("keyword", filters.keyword);
  }

  if (filters.status) {
    query.set("status", filters.status);
  }

  return query;
}
