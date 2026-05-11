export type CommodityStatus = "on_sale" | "pending" | "offline";

export type Commodity = {
  description: string;
  id: string;
  imageFileId: string;
  imageUrl: string;
  name: string;
  price: number;
  status: CommodityStatus;
  stock: number;
};

export type CommodityListPagination = {
  mode?: "cursor" | "offset";
  nextCursor?: string | null;
  page: number;
  pageSize: number;
  total: number;
};

export type CommodityListData = {
  list: Commodity[];
  pagination: CommodityListPagination;
  queryPlan?: {
    candidateIndex: string;
    coveredByIndex: boolean;
    costLevel: "high" | "low" | "medium";
    hasCreatedAtRange: boolean;
    hasKeyword: boolean;
    hasPriceRange: boolean;
    hasStatusFilter: boolean;
    hasStockRange: boolean;
    offset: number;
    page: number;
    paginationMode: "cursor" | "offset";
    recommendations: string[];
    sortDirection: "asc" | "desc";
    sortField: string;
    unsupportedFilters: string[];
  };
  sharding?: {
    routingMode: "broadcast" | "targeted";
    shardKey: "tenantId";
    shardName: string;
    tenantHash: string;
  };
};

export type CommodityListFilters = {
  createdFrom: string;
  createdTo: string;
  cursor: string;
  keyword: string;
  maxPrice: string;
  maxStock: string;
  minPrice: string;
  minStock: string;
  page: number;
  pageSize: number;
  sortBy: CommodityListSortBy;
  sortOrder: CommodityListSortOrder;
  status: CommodityStatus | "";
};

export type CommodityListSortBy =
  | "createdAt"
  | "name"
  | "price"
  | "status"
  | "stock";

export type CommodityListSortOrder = "asc" | "desc";

export type CommodityListPageData = CommodityListData & {
  filters: CommodityListFilters;
  totalPages: number;
};

export type CreateCommodityInput = {
  description: string;
  imageFileId?: string;
  imageUrl?: string;
  name: string;
  price: number;
  status: CommodityStatus;
  stock: number;
};

export type UpdateCommodityInput = {
  description: string;
  imageFileId?: string;
  imageUrl?: string;
  name: string;
  price: number;
  stock: number;
};

export type AuditLogAction =
  | "create"
  | "delete"
  | "restore"
  | "update"
  | "status_change";

export type AuditLog = {
  action: AuditLogAction;
  after: Record<string, unknown> | null;
  before: Record<string, unknown> | null;
  createdAt: string;
  operator: string;
  reason: string | null;
  target: {
    id: string;
    type: "commodity";
  };
  traceId: string;
};

export type AuditLogListData = {
  list: AuditLog[];
  pagination: CommodityListPagination;
};
