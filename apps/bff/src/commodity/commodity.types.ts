export type CommodityStatus = "on_sale" | "pending" | "offline";

export type Commodity = {
  description: string;
  id: string;
  name: string;
  price: number;
  status: CommodityStatus;
  stock: number;
};

export type CreateCommodityBody = {
  description?: string;
  name?: string;
  price?: number | string;
  status?: CommodityStatus;
  stock?: number | string;
};

export type CommodityListQuery = {
  keyword?: string;
  page?: string;
  pageSize?: string;
  status?: CommodityStatus;
};

export type CommodityListData = {
  list: Commodity[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
};
