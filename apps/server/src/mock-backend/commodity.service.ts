import { Injectable } from "@nestjs/common";
import { mockBusinessError, mockSuccess } from "./mock-response";

export type MockCommodity = {
  createdAt: string;
  createdBy: string;
  deletedAt: string | null;
  description: string;
  id: string;
  name: string;
  price: number;
  status: "on_sale" | "pending" | "offline";
  stock: number;
  updatedAt: string;
};

export type CreateCommodityBody = {
  createdBy?: string;
  description?: string;
  name?: string;
  price?: number | string;
  status?: MockCommodity["status"];
  stock?: number | string;
};

export type ListCommoditiesQuery = {
  createdAtFrom?: string;
  createdAtTo?: string;
  keyword?: string;
  limit?: string;
  offset?: string;
  priceMax?: string;
  priceMin?: string;
  sortDirection?: "asc" | "desc";
  sortField?: "createdAt" | "name" | "price" | "status" | "stock";
  status?: MockCommodity["status"];
  stockMax?: string;
  stockMin?: string;
};

export type UpdateCommodityStatusBody = {
  reason?: string;
  status?: MockCommodity["status"];
};

const mockCommodities: MockCommodity[] = [
  {
    createdAt: "2026-04-01T10:00:00.000Z",
    createdBy: "system",
    deletedAt: null,
    description: "适合桌面和户外场景的便携蓝牙音箱。",
    id: "10001",
    name: "北极光蓝牙音箱",
    price: 299,
    status: "on_sale",
    stock: 284,
    updatedAt: "2026-04-01T10:00:00.000Z"
  },
  {
    createdAt: "2026-04-03T10:00:00.000Z",
    createdBy: "system",
    deletedAt: null,
    description: "茶轴手感，支持多设备切换。",
    id: "10002",
    name: "风暴机械键盘",
    price: 699,
    status: "pending",
    stock: 42,
    updatedAt: "2026-04-03T10:00:00.000Z"
  },
  {
    createdAt: "2026-04-05T10:00:00.000Z",
    createdBy: "system",
    deletedAt: null,
    description: "铝合金材质，适合显示器增高收纳。",
    id: "10003",
    name: "雾白显示器支架",
    price: 199,
    status: "offline",
    stock: 0,
    updatedAt: "2026-04-05T10:00:00.000Z"
  }
];

@Injectable()
export class CommodityService {
  listCommodities(query: ListCommoditiesQuery = {}) {
    const offset = this.toNonNegativeInteger(query.offset, 0);
    const limit = this.toPositiveInteger(query.limit, 10);
    const keyword = query.keyword?.trim().toLowerCase();
    const priceMin = this.toOptionalNumber(query.priceMin);
    const priceMax = this.toOptionalNumber(query.priceMax);
    const stockMin = this.toOptionalNumber(query.stockMin);
    const stockMax = this.toOptionalNumber(query.stockMax);
    const createdAtFrom = query.createdAtFrom ? Date.parse(query.createdAtFrom) : undefined;
    const createdAtTo = query.createdAtTo ? Date.parse(query.createdAtTo) : undefined;

    // mock 数据筛选保持确定性，方便验证 BFF 和 client 行为。
    const filteredCommodities = mockCommodities.filter((commodity) => {
      const matchesVisible = !commodity.deletedAt;
      const matchesKeyword = keyword
        ? commodity.name.toLowerCase().includes(keyword) || commodity.id.includes(keyword)
        : true;
      const matchesStatus = query.status ? commodity.status === query.status : true;
      const matchesMinPrice = priceMin === undefined ? true : commodity.price >= priceMin;
      const matchesMaxPrice = priceMax === undefined ? true : commodity.price <= priceMax;
      const matchesMinStock = stockMin === undefined ? true : commodity.stock >= stockMin;
      const matchesMaxStock = stockMax === undefined ? true : commodity.stock <= stockMax;
      const commodityCreatedAt = Date.parse(commodity.createdAt);
      const matchesCreatedFrom = createdAtFrom === undefined ? true : commodityCreatedAt >= createdAtFrom;
      const matchesCreatedTo = createdAtTo === undefined ? true : commodityCreatedAt <= createdAtTo;

      return (
        matchesVisible &&
        matchesKeyword &&
        matchesStatus &&
        matchesMinPrice &&
        matchesMaxPrice &&
        matchesMinStock &&
        matchesMaxStock &&
        matchesCreatedFrom &&
        matchesCreatedTo
      );
    });

    const sortedCommodities = this.sortCommodities(
      filteredCommodities,
      query.sortField ?? "createdAt",
      query.sortDirection ?? "desc"
    );
    const list = sortedCommodities.slice(offset, offset + limit);

    return mockSuccess({
      list,
      pagination: {
        page: Math.floor(offset / limit) + 1,
        pageSize: limit,
        total: filteredCommodities.length
      }
    });
  }

  getCommodityById(id: string) {
    const commodity = mockCommodities.find((item) => item.id === id && !item.deletedAt);

    if (!commodity) {
      return mockBusinessError(20001, "commodity not found");
    }

    return mockSuccess(commodity);
  }

  createCommodity(body: CreateCommodityBody = {}) {
    const name = body.name?.trim();
    const description = body.description?.trim() ?? "";
    const createdBy = body.createdBy?.trim() ?? "";
    const price = Number(body.price);
    const stock = Number(body.stock);
    const status = body.status;

    // mock backend 做业务校验，BFF 只负责转发和错误语义转换。
    if (!name) {
      return mockBusinessError(20002, "commodity name is required");
    }

    if (!Number.isFinite(price) || price <= 0) {
      return mockBusinessError(20003, "commodity price must be greater than 0");
    }

    if (!Number.isInteger(stock) || stock < 0) {
      return mockBusinessError(20004, "commodity stock must be a non-negative integer");
    }

    if (!status || !this.isCommodityStatus(status)) {
      return mockBusinessError(20005, "commodity status is invalid");
    }

    if (!createdBy) {
      return mockBusinessError(20007, "createdBy is required");
    }

    if (mockCommodities.some((commodity) => commodity.name === name)) {
      return mockBusinessError(20006, "commodity name already exists");
    }

    const commodity: MockCommodity = {
      createdAt: new Date().toISOString(),
      createdBy,
      deletedAt: null,
      description,
      id: this.nextCommodityId(),
      name,
      price,
      status,
      stock,
      updatedAt: new Date().toISOString()
    };

    mockCommodities.unshift(commodity);

    return mockSuccess(commodity);
  }

  deleteCommodity(id: string) {
    const commodityIndex = mockCommodities.findIndex((commodity) => commodity.id === id && !commodity.deletedAt);

    if (commodityIndex < 0) {
      return mockBusinessError(20001, "commodity not found");
    }

    const commodity = mockCommodities[commodityIndex];
    const deletedAt = new Date().toISOString();

    commodity.deletedAt = deletedAt;
    commodity.updatedAt = deletedAt;

    return mockSuccess(commodity);
  }

  updateCommodityStatus(id: string, body: UpdateCommodityStatusBody = {}) {
    const commodity = mockCommodities.find((item) => item.id === id && !item.deletedAt);
    const reason = body.reason?.trim();

    if (!commodity) {
      return mockBusinessError(20001, "commodity not found");
    }

    if (!reason) {
      return mockBusinessError(20009, "status change reason is required");
    }

    if (body.status !== "on_sale") {
      return mockBusinessError(20010, "target status is invalid");
    }

    if (commodity.status !== "pending") {
      return mockBusinessError(20011, "only pending commodity can be approved");
    }

    const before: MockCommodity = {
      ...commodity
    };

    commodity.status = "on_sale";
    commodity.updatedAt = new Date().toISOString();

    return mockSuccess({
      after: commodity,
      before
    });
  }

  private toPositiveInteger(value: string | undefined, fallback: number) {
    const parsedValue = Number(value);

    // 非法分页参数直接降级为默认值，不作为业务错误处理。
    if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
      return fallback;
    }

    return parsedValue;
  }

  private toNonNegativeInteger(value: string | undefined, fallback: number) {
    const parsedValue = Number(value);

    if (!Number.isInteger(parsedValue) || parsedValue < 0) {
      return fallback;
    }

    return parsedValue;
  }

  private toOptionalNumber(value: string | undefined) {
    if (value === undefined || value.trim() === "") {
      return undefined;
    }

    const parsedValue = Number(value);
    return Number.isFinite(parsedValue) ? parsedValue : undefined;
  }

  private sortCommodities(
    commodities: MockCommodity[],
    sortField: NonNullable<ListCommoditiesQuery["sortField"]>,
    sortDirection: NonNullable<ListCommoditiesQuery["sortDirection"]>
  ) {
    const direction = sortDirection === "asc" ? 1 : -1;

    return [...commodities].sort((left, right) => {
      const leftValue = left[sortField];
      const rightValue = right[sortField];

      if (leftValue < rightValue) {
        return -1 * direction;
      }

      if (leftValue > rightValue) {
        return 1 * direction;
      }

      return 0;
    });
  }

  private isCommodityStatus(value: string): value is MockCommodity["status"] {
    return value === "on_sale" || value === "pending" || value === "offline";
  }

  private nextCommodityId() {
    const maxId = mockCommodities.reduce((max, commodity) => Math.max(max, Number(commodity.id)), 10000);
    return String(maxId + 1);
  }
}
