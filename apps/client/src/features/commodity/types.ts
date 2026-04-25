export type CommodityStatus = "on_sale" | "pending" | "offline";

export type Commodity = {
  description: string;
  id: string;
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
  name: string;
  price: number;
  status: CommodityStatus;
  stock: number;
};
