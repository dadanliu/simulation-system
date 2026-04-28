import { Injectable, type OnModuleInit } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { mockBusinessError, mockSuccess } from "./mock-response";
import { Commodity, type CommodityDocument } from "./schemas/commodity.schema";

export type MockCommodity = {
  createdAt: string;
  createdBy: string;
  deletedAt: string | null;
  deletedBy: string | null;
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

const defaultCommodities: MockCommodity[] = [
  {
    createdAt: "2026-04-01T10:00:00.000Z",
    createdBy: "system",
    deletedAt: null,
    deletedBy: null,
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
    deletedBy: null,
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
    deletedBy: null,
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
export class CommodityService implements OnModuleInit {
  constructor(@InjectModel(Commodity.name) private readonly commodityModel: Model<CommodityDocument>) {}

  async onModuleInit() {
    const total = await this.commodityModel.countDocuments();

    if (total > 0) {
      return;
    }

    await this.commodityModel.insertMany(
      defaultCommodities.map((commodity) => ({
        ...commodity,
        createdAt: new Date(commodity.createdAt),
        deletedAt: commodity.deletedAt ? new Date(commodity.deletedAt) : null,
        updatedAt: new Date(commodity.updatedAt)
      }))
    );
  }

  async listCommodities(query: ListCommoditiesQuery = {}) {
    const offset = this.toNonNegativeInteger(query.offset, 0);
    const limit = this.toPositiveInteger(query.limit, 10);
    const keyword = query.keyword?.trim();
    const priceMin = this.toOptionalNumber(query.priceMin);
    const priceMax = this.toOptionalNumber(query.priceMax);
    const stockMin = this.toOptionalNumber(query.stockMin);
    const stockMax = this.toOptionalNumber(query.stockMax);
    const createdAtFrom = query.createdAtFrom ? new Date(query.createdAtFrom) : undefined;
    const createdAtTo = query.createdAtTo ? new Date(query.createdAtTo) : undefined;

    const filters: Record<string, unknown> = {
      deletedAt: null
    };

    if (keyword) {
      filters.$or = [{ name: { $regex: keyword, $options: "i" } }, { id: { $regex: keyword, $options: "i" } }];
    }

    if (query.status) {
      filters.status = query.status;
    }

    if (priceMin !== undefined || priceMax !== undefined) {
      filters.price = {
        ...(priceMin === undefined ? {} : { $gte: priceMin }),
        ...(priceMax === undefined ? {} : { $lte: priceMax })
      };
    }

    if (stockMin !== undefined || stockMax !== undefined) {
      filters.stock = {
        ...(stockMin === undefined ? {} : { $gte: stockMin }),
        ...(stockMax === undefined ? {} : { $lte: stockMax })
      };
    }

    if ((createdAtFrom && !Number.isNaN(createdAtFrom.getTime())) || (createdAtTo && !Number.isNaN(createdAtTo.getTime()))) {
      filters.createdAt = {
        ...(createdAtFrom && !Number.isNaN(createdAtFrom.getTime()) ? { $gte: createdAtFrom } : {}),
        ...(createdAtTo && !Number.isNaN(createdAtTo.getTime()) ? { $lte: createdAtTo } : {})
      };
    }

    const sortField = query.sortField ?? "createdAt";
    const sortDirection = query.sortDirection === "asc" ? 1 : -1;

    const [commodities, total] = await Promise.all([
      this.commodityModel.find(filters).sort({ [sortField]: sortDirection }).skip(offset).limit(limit).lean(),
      this.commodityModel.countDocuments(filters)
    ]);

    return mockSuccess({
      list: commodities.map((commodity) => this.toCommodityView(commodity)),
      pagination: {
        page: Math.floor(offset / limit) + 1,
        pageSize: limit,
        total
      }
    });
  }

  async getCommodityById(id: string) {
    const commodity = await this.commodityModel.findOne({ id, deletedAt: null }).lean();

    if (!commodity) {
      return mockBusinessError(20001, "commodity not found");
    }

    return mockSuccess(this.toCommodityView(commodity));
  }

  async createCommodity(body: CreateCommodityBody = {}) {
    const name = body.name?.trim();
    const description = body.description?.trim() ?? "";
    const createdBy = body.createdBy?.trim() ?? "";
    const price = Number(body.price);
    const stock = Number(body.stock);
    const status = body.status;

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

    const duplicatedCommodity = await this.commodityModel.exists({ name });

    if (duplicatedCommodity) {
      return mockBusinessError(20006, "commodity name already exists");
    }

    const now = new Date();
    const commodity = await this.commodityModel.create({
      createdAt: now,
      createdBy,
      deletedAt: null,
      deletedBy: null,
      description,
      id: await this.nextCommodityId(),
      name,
      price,
      status,
      stock,
      updatedAt: now
    });

    return mockSuccess(this.toCommodityView(commodity.toObject()));
  }

  async deleteCommodity(id: string, deletedBy = "") {
    const deletedAt = new Date();
    const commodity = await this.commodityModel
      .findOneAndUpdate(
        { id, deletedAt: null },
        {
          $set: {
            deletedAt,
            deletedBy: deletedBy.trim() || null,
            updatedAt: deletedAt
          }
        },
        {
          new: true
        }
      )
      .lean();

    if (!commodity) {
      return mockBusinessError(20001, "commodity not found");
    }

    return mockSuccess(this.toCommodityView(commodity));
  }

  async updateCommodityStatus(id: string, body: UpdateCommodityStatusBody = {}) {
    const commodity = await this.commodityModel.findOne({ id, deletedAt: null });
    const reason = body.reason?.trim();

    if (!commodity) {
      return mockBusinessError(20001, "commodity not found");
    }

    if (!reason) {
      return mockBusinessError(20009, "status change reason is required");
    }

    if (body.status !== "on_sale" && body.status !== "offline") {
      return mockBusinessError(20010, "target status is invalid");
    }

    if (commodity.status === "pending" && body.status !== "on_sale") {
      return mockBusinessError(20011, "pending commodity can only be approved to on_sale");
    }

    if (commodity.status === "on_sale" && body.status !== "offline") {
      return mockBusinessError(20012, "on_sale commodity can only be taken offline");
    }

    if (commodity.status === "offline") {
      return mockBusinessError(20013, "offline commodity cannot change status directly");
    }

    const before = this.toCommodityView(commodity.toObject());
    commodity.status = body.status;
    commodity.updatedAt = new Date();
    await commodity.save();

    return mockSuccess({
      after: this.toCommodityView(commodity.toObject()),
      before
    });
  }

  private toPositiveInteger(value: string | undefined, fallback: number) {
    const parsedValue = Number(value);

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

  private isCommodityStatus(value: string): value is MockCommodity["status"] {
    return value === "on_sale" || value === "pending" || value === "offline";
  }

  private async nextCommodityId() {
    const commodities = await this.commodityModel.find({}, { id: 1, _id: 0 }).lean();
    const maxId = commodities.reduce((max, commodity) => Math.max(max, Number(commodity.id)), 10000);
    return String(maxId + 1);
  }

  private toCommodityView(commodity: {
    createdAt: Date | string;
    createdBy: string;
    deletedAt: Date | string | null;
    deletedBy: string | null;
    description: string;
    id: string;
    name: string;
    price: number;
    status: MockCommodity["status"];
    stock: number;
    updatedAt: Date | string;
  }): MockCommodity {
    return {
      createdAt: new Date(commodity.createdAt).toISOString(),
      createdBy: commodity.createdBy,
      deletedAt: commodity.deletedAt ? new Date(commodity.deletedAt).toISOString() : null,
      deletedBy: commodity.deletedBy,
      description: commodity.description,
      id: commodity.id,
      name: commodity.name,
      price: commodity.price,
      status: commodity.status,
      stock: commodity.stock,
      updatedAt: new Date(commodity.updatedAt).toISOString()
    };
  }
}
