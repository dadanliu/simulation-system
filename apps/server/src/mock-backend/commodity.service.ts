import { Injectable } from "@nestjs/common";
import { mockBusinessError, mockSuccess } from "./mock-response";

export type MockCommodity = {
  id: string;
  name: string;
  price: number;
  status: "on_sale" | "pending" | "offline";
  stock: number;
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
  listCommodities() {
    return mockSuccess({
      list: mockCommodities,
      pagination: {
        page: 1,
        pageSize: 10,
        total: mockCommodities.length
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
}
