import type {
  CommodityListFilters,
  CommodityListSortBy,
  CommodityListSortOrder,
  CommodityStatus
} from "@/src/features/commodity/types";

type SearchParamValue = string | string[] | undefined;

export type CommoditySearchParams = Record<string, SearchParamValue>;

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;
const DEFAULT_SORT_BY: CommodityListSortBy = "createdAt";
const DEFAULT_SORT_ORDER: CommodityListSortOrder = "desc";
const VALID_STATUSES = new Set<CommodityStatus>(["on_sale", "pending", "offline"]);
const VALID_SORT_BY = new Set<CommodityListSortBy>(["createdAt", "name", "price", "status", "stock"]);
const VALID_SORT_ORDER = new Set<CommodityListSortOrder>(["asc", "desc"]);
const KNOWN_QUERY_KEYS = [
  "createdFrom",
  "createdTo",
  "keyword",
  "maxPrice",
  "maxStock",
  "minPrice",
  "minStock",
  "page",
  "pageSize",
  "sortBy",
  "sortOrder",
  "status"
] as const;

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

function parseSortBy(value: SearchParamValue): CommodityListSortBy {
  const sortBy = firstSearchParam(value);
  return sortBy && VALID_SORT_BY.has(sortBy as CommodityListSortBy) ? (sortBy as CommodityListSortBy) : DEFAULT_SORT_BY;
}

function parseSortOrder(value: SearchParamValue): CommodityListSortOrder {
  const sortOrder = firstSearchParam(value);
  return sortOrder && VALID_SORT_ORDER.has(sortOrder as CommodityListSortOrder)
    ? (sortOrder as CommodityListSortOrder)
    : DEFAULT_SORT_ORDER;
}

function readString(value: SearchParamValue) {
  return firstSearchParam(value)?.trim() ?? "";
}

export function readCommodityListFilters(searchParams: CommoditySearchParams): CommodityListFilters {
  return {
    createdFrom: readString(searchParams.createdFrom),
    createdTo: readString(searchParams.createdTo),
    keyword: readString(searchParams.keyword),
    maxPrice: readString(searchParams.maxPrice),
    maxStock: readString(searchParams.maxStock),
    minPrice: readString(searchParams.minPrice),
    minStock: readString(searchParams.minStock),
    page: parsePositiveInteger(searchParams.page, DEFAULT_PAGE),
    pageSize: parsePositiveInteger(searchParams.pageSize, DEFAULT_PAGE_SIZE),
    sortBy: parseSortBy(searchParams.sortBy),
    sortOrder: parseSortOrder(searchParams.sortOrder),
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

  if (filters.minPrice) {
    query.set("minPrice", filters.minPrice);
  }

  if (filters.maxPrice) {
    query.set("maxPrice", filters.maxPrice);
  }

  if (filters.minStock) {
    query.set("minStock", filters.minStock);
  }

  if (filters.maxStock) {
    query.set("maxStock", filters.maxStock);
  }

  if (filters.createdFrom) {
    query.set("createdFrom", filters.createdFrom);
  }

  if (filters.createdTo) {
    query.set("createdTo", filters.createdTo);
  }

  if (filters.status) {
    query.set("status", filters.status);
  }

  query.set("sortBy", filters.sortBy);
  query.set("sortOrder", filters.sortOrder);

  return query;
}

export function buildCommodityListRequestSearchParams(searchParams: CommoditySearchParams) {
  const query = new URLSearchParams();

  for (const key of KNOWN_QUERY_KEYS) {
    const value = firstSearchParam(searchParams[key]);

    if (value !== undefined && value !== "") {
      query.set(key, value);
    }
  }

  return query;
}
