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
  page: number;
  pageSize: number;
  total: number;
};

export type CommodityListData = {
  list: Commodity[];
  pagination: CommodityListPagination;
};

export type CommodityListFilters = {
  keyword: string;
  page: number;
  pageSize: number;
  status: CommodityStatus | "";
};

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

export type AuditLogAction = "create" | "delete" | "status_change";

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
