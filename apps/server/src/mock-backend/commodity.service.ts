import { Injectable } from "@nestjs/common";
import { mockBusinessError, mockSuccess } from "./mock-response";

export type MockCommodity = {
  id: string;
  name: string;
  price: number;
  status: "on_sale" | "pending" | "offline";
  stock: number;
};

export type ListCommoditiesQuery = {
  keyword?: string;
  page?: string;
  pageSize?: string;
  status?: MockCommodity["status"];
};

const mockCommodities: MockCommodity[] = [
  {
    id: "10001",
    name: "北极光蓝牙音箱",
    price: 299,
    status: "on_sale",
    stock: 284
  },
  {
    id: "10002",
    name: "风暴机械键盘",
    price: 699,
    status: "pending",
    stock: 42
  },
  {
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

  private toPositiveInteger(value: string | undefined, fallback: number) {
    const parsedValue = Number(value);

    // 非法分页参数直接降级为默认值，不作为业务错误处理。
    if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
      return fallback;
    }

    return parsedValue;
  }
}
