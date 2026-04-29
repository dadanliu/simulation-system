export type CommodityStatus = "on_sale" | "pending" | "offline";

export type Commodity = {
  createdAt: string;
  createdBy: string;
  deletedAt: string | null;
  deletedBy: string | null;
  description: string;
  id: string;
  imageFileId: string;
  imageUrl: string;
  name: string;
  price: number;
  status: CommodityStatus;
  stock: number;
  updatedAt: string;
};

export type CreateCommodityBody = {
  createdBy?: string;
  description?: string;
  imageFileId?: string;
  imageUrl?: string;
  name?: string;
  price?: number | string;
  status?: CommodityStatus;
  stock?: number | string;
};

export type CommodityListQuery = {
  createdFrom?: string;
  createdTo?: string;
  keyword?: string;
  maxPrice?: number;
  maxStock?: number;
  minPrice?: number;
  minStock?: number;
  page?: string;
  pageSize?: string;
  sortBy?: "createdAt" | "name" | "price" | "status" | "stock";
  sortOrder?: "asc" | "desc";
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
