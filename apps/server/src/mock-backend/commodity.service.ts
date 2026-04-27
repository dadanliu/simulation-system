import { Injectable } from "@nestjs/common";
import { mockBusinessError, mockSuccess } from "./mock-response";

export type MockCommodity = {
  description: string;
  id: string;
  name: string;
  price: number;
  status: "on_sale" | "pending" | "offline";
  stock: number;
};

export type CreateCommodityBody = {
  description?: string;
  name?: string;
  price?: number | string;
  status?: MockCommodity["status"];
  stock?: number | string;
};

export type ListCommoditiesQuery = {
  keyword?: string;
  page?: string;
  pageSize?: string;
  status?: MockCommodity["status"];
};

const mockCommodities: MockCommodity[] = [
  {
    description: "适合桌面和户外场景的便携蓝牙音箱。",
    id: "10001",
    name: "北极光蓝牙音箱",
    price: 299,
    status: "on_sale",
    stock: 284
  },
  {
    description: "茶轴手感，支持多设备切换。",
    id: "10002",
    name: "风暴机械键盘",
    price: 699,
    status: "pending",
    stock: 42
  },
  {
    description: "铝合金材质，适合显示器增高收纳。",
    id: "10003",
    name: "雾白显示器支架",
    price: 199,
    status: "offline",
    stock: 0
  }
];

@Injectable()
export class CommodityService {
  listCommodities(query: ListCommoditiesQuery = {}) {
    const page = this.toPositiveInteger(query.page, 1);
    const pageSize = this.toPositiveInteger(query.pageSize, 10);
    const keyword = query.keyword?.trim().toLowerCase();

    // mock 数据筛选保持确定性，方便验证 BFF 和 client 行为。
    const filteredCommodities = mockCommodities.filter((commodity) => {
      const matchesKeyword = keyword
        ? commodity.name.toLowerCase().includes(keyword) || commodity.id.includes(keyword)
        : true;
      const matchesStatus = query.status ? commodity.status === query.status : true;

      return matchesKeyword && matchesStatus;
    });

    const start = (page - 1) * pageSize;
    const list = filteredCommodities.slice(start, start + pageSize);

    return mockSuccess({
      list,
      pagination: {
        page,
        pageSize,
        total: filteredCommodities.length
      }
    });
  }

  getCommodityById(id: string) {
    const commodity = mockCommodities.find((item) => item.id === id);

    if (!commodity) {
      return mockBusinessError(20001, "commodity not found");
    }

    return mockSuccess(commodity);
  }

  createCommodity(body: CreateCommodityBody = {}) {
    const name = body.name?.trim();
    const description = body.description?.trim() ?? "";
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

    if (mockCommodities.some((commodity) => commodity.name === name)) {
      return mockBusinessError(20006, "commodity name already exists");
    }

    const commodity: MockCommodity = {
      description,
      id: this.nextCommodityId(),
      name,
      price,
      status,
      stock
    };

    mockCommodities.unshift(commodity);

    return mockSuccess(commodity);
  }

  deleteCommodity(id: string) {
    const commodityIndex = mockCommodities.findIndex((commodity) => commodity.id === id);

    if (commodityIndex < 0) {
      return mockBusinessError(20001, "commodity not found");
    }

    const [commodity] = mockCommodities.splice(commodityIndex, 1);
    return mockSuccess(commodity);
  }

  private toPositiveInteger(value: string | undefined, fallback: number) {
    const parsedValue = Number(value);

    // 非法分页参数直接降级为默认值，不作为业务错误处理。
    if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
      return fallback;
    }

    return parsedValue;
  }

  private isCommodityStatus(value: string): value is MockCommodity["status"] {
    return value === "on_sale" || value === "pending" || value === "offline";
  }

  private nextCommodityId() {
    const maxId = mockCommodities.reduce((max, commodity) => Math.max(max, Number(commodity.id)), 10000);
    return String(maxId + 1);
  }
}
