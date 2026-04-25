export type CommodityStatus = "on_sale" | "pending" | "offline";

export type Commodity = {
  id: string;
  name: string;
  price: number;
  status: CommodityStatus;
  stock: number;
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
