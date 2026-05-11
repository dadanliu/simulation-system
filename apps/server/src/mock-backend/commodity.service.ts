import { SpanKind } from "@opentelemetry/api";
import { Injectable, type OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { createHash } from "node:crypto";
import { writeStructuredLog } from "../common/logging/structured-log";
import { runObservedSpan } from "../common/tracing/observed-span";
import {
  isCommodityStatus,
  validateCommodityStatusTransition
} from "./commodity-status-rules";
import { mockBusinessError, mockSuccess } from "./mock-response";
import { Commodity, type CommodityDocument } from "./schemas/commodity.schema";

export type MockCommodity = {
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
  status: "on_sale" | "pending" | "offline";
  stock: number;
  tenantId: string;
  updatedAt: string;
};

export type CreateCommodityBody = {
  createdBy?: string;
  description?: string;
  imageFileId?: string;
  imageUrl?: string;
  name?: string;
  price?: number | string;
  status?: MockCommodity["status"];
  stock?: number | string;
};

export type ListCommoditiesQuery = {
  createdAtFrom?: string;
  createdAtTo?: string;
  cursor?: string;
  keyword?: string;
  limit?: string;
  offset?: string;
  page?: string;
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

export type UpdateCommodityBody = {
  description?: string;
  imageFileId?: string;
  imageUrl?: string;
  name?: string;
  price?: number | string;
  stock?: number | string;
  updatedBy?: string;
};

const COMMODITY_LIST_MAX_PAGE_SIZE = 100;
const DEFAULT_TENANT_ID = "tenant_demo";

const defaultCommodities: MockCommodity[] = [
  {
    createdAt: "2026-04-01T10:00:00.000Z",
    createdBy: "system",
    deletedAt: null,
    deletedBy: null,
    description: "适合桌面和户外场景的便携蓝牙音箱。",
    id: "10001",
    imageFileId: "",
    imageUrl: "",
    name: "北极光蓝牙音箱",
    price: 299,
    status: "on_sale",
    stock: 284,
    tenantId: DEFAULT_TENANT_ID,
    updatedAt: "2026-04-01T10:00:00.000Z"
  },
  {
    createdAt: "2026-04-03T10:00:00.000Z",
    createdBy: "system",
    deletedAt: null,
    deletedBy: null,
    description: "茶轴手感，支持多设备切换。",
    id: "10002",
    imageFileId: "",
    imageUrl: "",
    name: "风暴机械键盘",
    price: 699,
    status: "pending",
    stock: 42,
    tenantId: DEFAULT_TENANT_ID,
    updatedAt: "2026-04-03T10:00:00.000Z"
  },
  {
    createdAt: "2026-04-05T10:00:00.000Z",
    createdBy: "system",
    deletedAt: null,
    deletedBy: null,
    description: "铝合金材质，适合显示器增高收纳。",
    id: "10003",
    imageFileId: "",
    imageUrl: "",
    name: "雾白显示器支架",
    price: 199,
    status: "offline",
    stock: 0,
    tenantId: DEFAULT_TENANT_ID,
    updatedAt: "2026-04-05T10:00:00.000Z"
  }
];

const DEFAULT_SORT_FIELD: NonNullable<ListCommoditiesQuery["sortField"]> =
  "createdAt";
const CREATED_AT_INDEX_NAME = "idx_commodities_tenant_active_created_at_id";
const SORT_FIELD_WHITELIST = new Set<
  NonNullable<ListCommoditiesQuery["sortField"]>
>(["createdAt", "name", "price", "status", "stock"]);
const STATUS_CREATED_AT_INDEX_NAME =
  "idx_commodities_tenant_active_status_created_at_id";
const STATUS_INDEX_NAME = "idx_commodities_tenant_active_status";

type CommodityCursor = {
  createdAt: string;
  id: string;
};

type QueryPlanInput = {
  candidateIndex: string;
  hasCreatedAtRange: boolean;
  hasKeyword: boolean;
  hasPriceRange: boolean;
  hasStatusFilter: boolean;
  hasStockRange: boolean;
  hasTenantContext: boolean;
  offset: number;
  page: number;
  paginationMode: "cursor" | "offset";
  routingMode: "broadcast" | "targeted";
  sortDirection: 1 | -1;
  sortField: NonNullable<ListCommoditiesQuery["sortField"]>;
};

@Injectable()
export class CommodityService implements OnModuleInit {
  constructor(
    @InjectModel(Commodity.name)
    private readonly commodityModel: Model<CommodityDocument>,
    private readonly configService: ConfigService
  ) {}

  async onModuleInit() {
    if (!this.shouldRunMockSeed()) {
      return;
    }

    await this.seedDefaultCommoditiesIfEmpty();
  }

  async resetForTest() {
    await this.commodityModel.deleteMany({});
    await this.seedDefaultCommodities();
  }

  private async seedDefaultCommoditiesIfEmpty() {
    const total = await this.commodityModel.countDocuments();

    if (total > 0) {
      return;
    }

    await this.seedDefaultCommodities();
  }

  private async seedDefaultCommodities() {
    await this.commodityModel.insertMany(
      defaultCommodities.map((commodity) => ({
        ...commodity,
        createdAt: new Date(commodity.createdAt),
        deletedAt: commodity.deletedAt ? new Date(commodity.deletedAt) : null,
        updatedAt: new Date(commodity.updatedAt)
      }))
    );
  }

  private shouldRunMockSeed() {
    const appEnv = this.configService.get<string>("APP_ENV", "development");
    const enabled = this.configService.get<string>("MOCK_SEED_ENABLED");

    if (appEnv === "production") {
      return false;
    }

    if (enabled !== undefined) {
      return enabled === "true";
    }

    return true;
  }

  async listCommodities(
    query: ListCommoditiesQuery = {},
    traceId = "",
    tenantId?: string
  ) {
    const tenantContext = this.normalizeTenantId(tenantId);
    const hasTenantContext = Boolean(tenantContext);
    const offset = this.toNonNegativeInteger(query.offset, 0);
    const limit = this.toPageSize(query.limit, 10);
    const keyword = query.keyword?.trim();
    const priceMin = this.toOptionalNumber(query.priceMin);
    const priceMax = this.toOptionalNumber(query.priceMax);
    const stockMin = this.toOptionalNumber(query.stockMin);
    const stockMax = this.toOptionalNumber(query.stockMax);
    const createdAtFrom = query.createdAtFrom
      ? new Date(query.createdAtFrom)
      : undefined;
    const createdAtTo = query.createdAtTo
      ? new Date(query.createdAtTo)
      : undefined;

    const andFilters: Record<string, unknown>[] = [];
    const filters: Record<string, unknown> = {
      deletedAt: null
    };

    if (tenantContext) {
      filters.tenantId = tenantContext;
    }

    if (keyword) {
      andFilters.push({
        $or: [
          { name: { $regex: keyword, $options: "i" } },
          { id: { $regex: keyword, $options: "i" } }
        ]
      });
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

    if (
      (createdAtFrom && !Number.isNaN(createdAtFrom.getTime())) ||
      (createdAtTo && !Number.isNaN(createdAtTo.getTime()))
    ) {
      filters.createdAt = {
        ...(createdAtFrom && !Number.isNaN(createdAtFrom.getTime())
          ? { $gte: createdAtFrom }
          : {}),
        ...(createdAtTo && !Number.isNaN(createdAtTo.getTime())
          ? { $lte: createdAtTo }
          : {})
      };
    }

    const sortField = this.toSortField(query.sortField);
    const sortDirection = query.sortDirection === "asc" ? 1 : -1;
    const sort = this.buildSort(sortField, sortDirection);
    const cursor = this.parseCursor(query.cursor);

    if (query.cursor && !cursor) {
      return mockBusinessError(20011, "commodity cursor is invalid");
    }

    if (cursor && sortField !== "createdAt") {
      return mockBusinessError(
        20012,
        "commodity cursor only supports createdAt sort"
      );
    }

    if (cursor) {
      andFilters.push(this.buildCursorFilter(cursor, sortDirection));
    }

    if (andFilters.length) {
      filters.$and = andFilters;
    }

    const countFilters = this.buildCountFilters(filters, cursor);
    const effectiveOffset = cursor ? 0 : offset;
    const supportsCursor = sortField === "createdAt";
    const fetchLimit = supportsCursor ? limit + 1 : limit;
    const candidateIndex = this.selectCandidateIndex({
      hasTenantContext,
      hasStatusFilter: Boolean(query.status),
      sortField
    });
    const page = cursor
      ? this.toPositiveInteger(query.page, 1)
      : Math.floor(offset / limit) + 1;
    const sharding = this.buildShardingDebug(tenantContext);
    const queryPlan = this.buildQueryPlan({
      candidateIndex,
      hasCreatedAtRange: Boolean(filters.createdAt),
      hasKeyword: Boolean(keyword),
      hasPriceRange: Boolean(filters.price),
      hasStatusFilter: Boolean(query.status),
      hasStockRange: Boolean(filters.stock),
      hasTenantContext,
      offset: effectiveOffset,
      page,
      paginationMode: cursor ? "cursor" : "offset",
      routingMode: sharding.routingMode,
      sortDirection,
      sortField
    });

    writeStructuredLog({
      context: CommodityService.name,
      event: "commodity_list_query_planned",
      fields: {
        candidateIndex,
        costLevel: queryPlan.costLevel,
        coveredByIndex: queryPlan.coveredByIndex,
        hasCreatedAtRange: Boolean(filters.createdAt),
        hasKeyword: Boolean(keyword),
        hasPriceRange: Boolean(filters.price),
        hasStatusFilter: Boolean(query.status),
        hasStockRange: Boolean(filters.stock),
        hasTenantContext,
        limit,
        offset: effectiveOffset,
        page,
        paginationMode: cursor ? "cursor" : "offset",
        routingMode: sharding.routingMode,
        shardKey: sharding.shardKey,
        shardName: sharding.shardName,
        sortDirection,
        sortField,
        tenantHash: sharding.tenantHash,
        traceId,
        unsupportedFilters: queryPlan.unsupportedFilters
      },
      level: "info"
    });

    const [commodities, total] = await runObservedSpan(
      "MongoDB commodities list",
      {
        "db.collection.name": "commodities",
        "db.operation.name": "find_and_count",
        "db.system.name": "mongodb",
        "next_bff.commodity.candidate_index": candidateIndex,
        "next_bff.commodity.cost_level": queryPlan.costLevel,
        "next_bff.commodity.covered_by_index": queryPlan.coveredByIndex,
        "next_bff.commodity.has_created_at_range": Boolean(filters.createdAt),
        "next_bff.commodity.has_keyword": Boolean(keyword),
        "next_bff.commodity.has_price_range": Boolean(filters.price),
        "next_bff.commodity.has_status_filter": Boolean(query.status),
        "next_bff.commodity.has_stock_range": Boolean(filters.stock),
        "next_bff.commodity.has_tenant_context": hasTenantContext,
        "next_bff.commodity.limit": limit,
        "next_bff.commodity.offset": effectiveOffset,
        "next_bff.commodity.page": page,
        "next_bff.commodity.pagination_mode": cursor ? "cursor" : "offset",
        "next_bff.commodity.routing_mode": sharding.routingMode,
        "next_bff.commodity.shard_name": sharding.shardName,
        "next_bff.commodity.sort_direction": sortDirection,
        "next_bff.commodity.sort_field": sortField,
        "next_bff.commodity.tenant_hash": sharding.tenantHash,
        "next_bff.commodity.unsupported_filters":
          queryPlan.unsupportedFilters.join(","),
        "next_bff.trace_id": traceId
      },
      () =>
        Promise.all([
          this.commodityModel
            .find(filters)
            .sort(sort)
            .skip(effectiveOffset)
            .limit(fetchLimit)
            .lean(),
          this.commodityModel.countDocuments(countFilters)
        ]),
      SpanKind.CLIENT
    );
    const visibleCommodities = supportsCursor
      ? commodities.slice(0, limit)
      : commodities;
    const lastVisibleCommodity =
      visibleCommodities[visibleCommodities.length - 1];
    const nextCursor =
      supportsCursor && commodities.length > limit && lastVisibleCommodity
        ? this.encodeCursor(lastVisibleCommodity)
        : null;

    return mockSuccess({
      list: visibleCommodities.map((commodity) =>
        this.toCommodityView(commodity)
      ),
      pagination: {
        mode: cursor ? "cursor" : "offset",
        nextCursor,
        page,
        pageSize: limit,
        total
      },
      queryPlan,
      sharding
    });
  }

  async getCommodityById(id: string, tenantId?: string) {
    const tenantContext = this.normalizeTenantIdForWrite(tenantId);
    const commodity = await this.commodityModel
      .findOne({ id, deletedAt: null, tenantId: tenantContext })
      .lean();

    if (!commodity) {
      return mockBusinessError(20001, "commodity not found");
    }

    return mockSuccess(this.toCommodityView(commodity));
  }

  async createCommodity(body: CreateCommodityBody = {}, tenantId?: string) {
    const tenantContext = this.normalizeTenantIdForWrite(tenantId);
    const name = body.name?.trim();
    const description = body.description?.trim() ?? "";
    const createdBy = body.createdBy?.trim() ?? "";
    const imageFileId = body.imageFileId?.trim() ?? "";
    const imageUrl = body.imageUrl?.trim() ?? "";
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
      return mockBusinessError(
        20004,
        "commodity stock must be a non-negative integer"
      );
    }

    if (!status || !isCommodityStatus(status)) {
      return mockBusinessError(20005, "commodity status is invalid");
    }

    if (!createdBy) {
      return mockBusinessError(20007, "createdBy is required");
    }

    const duplicatedTenantCommodity = await this.commodityModel.exists({
      name,
      tenantId: tenantContext
    });

    if (duplicatedTenantCommodity) {
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
      imageFileId,
      imageUrl,
      name,
      price,
      status,
      stock,
      tenantId: tenantContext,
      updatedAt: now
    });

    return mockSuccess(this.toCommodityView(commodity.toObject()));
  }

  async deleteCommodity(id: string, deletedBy = "", tenantId?: string) {
    const tenantContext = this.normalizeTenantIdForWrite(tenantId);
    const deletedAt = new Date();
    const commodity = await this.commodityModel.findOne({
      id,
      deletedAt: null,
      tenantId: tenantContext
    });

    if (!commodity) {
      return mockBusinessError(20001, "commodity not found");
    }

    const before = this.toCommodityView(commodity.toObject());
    commodity.deletedAt = deletedAt;
    commodity.deletedBy = deletedBy.trim() || null;
    commodity.updatedAt = deletedAt;
    await commodity.save();

    return mockSuccess({
      after: this.toCommodityView(commodity.toObject()),
      before
    });
  }

  async updateCommodity(
    id: string,
    body: UpdateCommodityBody = {},
    tenantId?: string
  ) {
    const tenantContext = this.normalizeTenantIdForWrite(tenantId);
    const commodity = await this.commodityModel.findOne({
      id,
      deletedAt: null,
      tenantId: tenantContext
    });
    const name = body.name?.trim();
    const description = body.description?.trim() ?? "";
    const imageFileId = body.imageFileId?.trim() ?? "";
    const imageUrl = body.imageUrl?.trim() ?? "";
    const price = Number(body.price);
    const stock = Number(body.stock);

    if (!commodity) {
      return mockBusinessError(20001, "commodity not found");
    }

    if (!name) {
      return mockBusinessError(20002, "commodity name is required");
    }

    if (!Number.isFinite(price) || price <= 0) {
      return mockBusinessError(20003, "commodity price must be greater than 0");
    }

    if (!Number.isInteger(stock) || stock < 0) {
      return mockBusinessError(
        20004,
        "commodity stock must be a non-negative integer"
      );
    }

    const duplicatedCommodity = await this.commodityModel.exists({
      id: { $ne: id },
      name,
      tenantId: tenantContext
    });

    if (duplicatedCommodity) {
      return mockBusinessError(20006, "commodity name already exists");
    }

    const before = this.toCommodityView(commodity.toObject());

    commodity.description = description;
    commodity.imageFileId = imageFileId;
    commodity.imageUrl = imageUrl;
    commodity.name = name;
    commodity.price = price;
    commodity.stock = stock;
    commodity.updatedAt = new Date();
    await commodity.save();

    return mockSuccess({
      after: this.toCommodityView(commodity.toObject()),
      before
    });
  }

  async restoreCommodity(id: string, tenantId?: string) {
    const tenantContext = this.normalizeTenantIdForWrite(tenantId);
    const commodity = await this.commodityModel.findOne({
      id,
      deletedAt: { $ne: null },
      tenantId: tenantContext
    });

    if (!commodity) {
      return mockBusinessError(20001, "commodity not found");
    }

    const before = this.toCommodityView(commodity.toObject());
    commodity.deletedAt = null;
    commodity.deletedBy = null;
    commodity.updatedAt = new Date();
    await commodity.save();

    return mockSuccess({
      after: this.toCommodityView(commodity.toObject()),
      before
    });
  }

  async updateCommodityStatus(
    id: string,
    body: UpdateCommodityStatusBody = {},
    tenantId?: string
  ) {
    const tenantContext = this.normalizeTenantIdForWrite(tenantId);
    const commodity = await this.commodityModel.findOne({
      id,
      deletedAt: null,
      tenantId: tenantContext
    });
    const reason = body.reason?.trim();

    if (!commodity) {
      return mockBusinessError(20001, "commodity not found");
    }

    if (!reason) {
      return mockBusinessError(20009, "status change reason is required");
    }

    if (!isCommodityStatus(body.status)) {
      return mockBusinessError(20010, "target status is invalid");
    }

    const transitionResult = validateCommodityStatusTransition(
      commodity.status,
      body.status
    );

    if (!transitionResult.ok) {
      return mockBusinessError(transitionResult.code, transitionResult.message);
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

  private toPageSize(value: string | undefined, fallback: number) {
    return Math.min(
      this.toPositiveInteger(value, fallback),
      COMMODITY_LIST_MAX_PAGE_SIZE
    );
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

  private async nextCommodityId() {
    const commodities = await this.commodityModel
      .find({}, { id: 1, _id: 0 })
      .lean();
    const maxId = commodities.reduce(
      (max, commodity) => Math.max(max, Number(commodity.id)),
      10000
    );
    return String(maxId + 1);
  }

  private buildSort(
    sortField: NonNullable<ListCommoditiesQuery["sortField"]>,
    sortDirection: 1 | -1
  ): Record<string, 1 | -1> {
    // 主排序字段允许按 UI 选择切换；id 作为稳定的次排序字段，
    // 避免相同 createdAt / price / stock 等值时，分页结果顺序不确定。
    return {
      [sortField]: sortDirection,
      id: sortDirection
    };
  }

  private toSortField(
    value: ListCommoditiesQuery["sortField"]
  ): NonNullable<ListCommoditiesQuery["sortField"]> {
    return value && SORT_FIELD_WHITELIST.has(value)
      ? value
      : DEFAULT_SORT_FIELD;
  }

  private selectCandidateIndex(input: {
    hasTenantContext: boolean;
    hasStatusFilter: boolean;
    sortField: NonNullable<ListCommoditiesQuery["sortField"]>;
  }) {
    if (!input.hasTenantContext) {
      return "scatter_gather_no_shard_key";
    }

    if (input.hasStatusFilter && input.sortField === "createdAt") {
      return STATUS_CREATED_AT_INDEX_NAME;
    }

    if (input.sortField === "createdAt") {
      return CREATED_AT_INDEX_NAME;
    }

    if (input.hasStatusFilter) {
      return STATUS_INDEX_NAME;
    }

    return "no_matching_compound_index";
  }

  private normalizeTenantId(tenantId: string | undefined) {
    return tenantId?.trim() ?? "";
  }

  private normalizeTenantIdForWrite(tenantId: string | undefined) {
    return this.normalizeTenantId(tenantId) || DEFAULT_TENANT_ID;
  }

  private buildShardingDebug(tenantId: string) {
    const tenantHash = tenantId
      ? createHash("sha256").update(tenantId).digest("hex").slice(0, 12)
      : "missing";
    const shardNumber = tenantId
      ? (Number.parseInt(tenantHash.slice(0, 2), 16) % 3) + 1
      : 0;

    return {
      routingMode: tenantId ? ("targeted" as const) : ("broadcast" as const),
      shardKey: "tenantId" as const,
      shardName: tenantId ? `shard-${shardNumber}` : "all-shards",
      tenantHash
    };
  }

  private buildQueryPlan(input: QueryPlanInput) {
    const unsupportedFilters: string[] = [];

    if (!input.hasTenantContext) {
      unsupportedFilters.push("tenantId");
    }

    if (input.hasKeyword) {
      unsupportedFilters.push("keyword");
    }

    if (input.hasPriceRange) {
      unsupportedFilters.push("price");
    }

    if (input.hasStockRange) {
      unsupportedFilters.push("stock");
    }

    if (input.sortField !== "createdAt") {
      unsupportedFilters.push(`sort:${input.sortField}`);
    }

    const coveredByIndex =
      unsupportedFilters.length === 0 &&
      input.candidateIndex !== "no_matching_compound_index" &&
      input.candidateIndex !== "scatter_gather_no_shard_key";
    const costLevel = this.selectQueryCostLevel(input, unsupportedFilters);

    return {
      candidateIndex: input.candidateIndex,
      coveredByIndex,
      costLevel,
      hasCreatedAtRange: input.hasCreatedAtRange,
      hasKeyword: input.hasKeyword,
      hasPriceRange: input.hasPriceRange,
      hasStatusFilter: input.hasStatusFilter,
      hasStockRange: input.hasStockRange,
      offset: input.offset,
      page: input.page,
      paginationMode: input.paginationMode,
      recommendations: this.buildIndexRecommendations(input, {
        coveredByIndex,
        costLevel,
        unsupportedFilters
      }),
      sortDirection:
        input.sortDirection === 1 ? ("asc" as const) : ("desc" as const),
      sortField: input.sortField,
      unsupportedFilters
    };
  }

  private selectQueryCostLevel(
    input: QueryPlanInput,
    unsupportedFilters: string[]
  ) {
    if (
      input.routingMode === "broadcast" ||
      input.offset >= 10_000 ||
      unsupportedFilters.length >= 2
    ) {
      return "high" as const;
    }

    if (
      input.offset >= 1_000 ||
      unsupportedFilters.length === 1 ||
      (input.paginationMode === "offset" && input.offset > 0)
    ) {
      return "medium" as const;
    }

    return "low" as const;
  }

  private buildIndexRecommendations(
    input: QueryPlanInput,
    result: {
      coveredByIndex: boolean;
      costLevel: "high" | "low" | "medium";
      unsupportedFilters: string[];
    }
  ) {
    const recommendations: string[] = [];

    if (result.coveredByIndex) {
      recommendations.push("当前查询可由商品复合索引覆盖主要筛选和排序。");
    }

    if (!input.hasTenantContext) {
      recommendations.push("请求缺少 tenantId，会退化为跨分片查询。");
    }

    if (input.hasKeyword) {
      recommendations.push(
        "keyword 使用正则匹配，规模变大后应评估文本索引或搜索服务。"
      );
    }

    if (input.hasPriceRange || input.hasStockRange) {
      recommendations.push(
        "价格或库存范围筛选未进入当前核心复合索引，新增前要确认使用频率和选择性。"
      );
    }

    if (input.sortField !== "createdAt") {
      recommendations.push(
        "非 createdAt 排序不是当前主索引路径，可能产生更多扫描或内存排序。"
      );
    }

    if (input.offset >= 1_000) {
      recommendations.push(
        "offset 较大，建议使用 cursor 分页减少深页跳过成本。"
      );
    }

    if (result.costLevel === "low" && recommendations.length === 0) {
      recommendations.push("查询成本低，保持当前索引即可。");
    }

    return recommendations;
  }

  private parseCursor(cursor: string | undefined): CommodityCursor | null {
    if (!cursor) {
      return null;
    }

    try {
      const parsed = JSON.parse(
        Buffer.from(cursor, "base64url").toString("utf8")
      ) as Partial<CommodityCursor>;

      if (
        !parsed.createdAt ||
        Number.isNaN(new Date(parsed.createdAt).getTime()) ||
        !parsed.id
      ) {
        return null;
      }

      return {
        createdAt: parsed.createdAt,
        id: parsed.id
      };
    } catch {
      return null;
    }
  }

  private encodeCursor(commodity: { createdAt: Date | string; id: string }) {
    return Buffer.from(
      JSON.stringify({
        createdAt: new Date(commodity.createdAt).toISOString(),
        id: commodity.id
      })
    ).toString("base64url");
  }

  private buildCursorFilter(cursor: CommodityCursor, sortDirection: 1 | -1) {
    const cursorCreatedAt = new Date(cursor.createdAt);
    const dateOperator = sortDirection === -1 ? "$lt" : "$gt";
    const idOperator = sortDirection === -1 ? "$lt" : "$gt";

    return {
      $or: [
        { createdAt: { [dateOperator]: cursorCreatedAt } },
        {
          createdAt: cursorCreatedAt,
          id: { [idOperator]: cursor.id }
        }
      ]
    };
  }

  private buildCountFilters(
    filters: Record<string, unknown>,
    cursor: CommodityCursor | null
  ) {
    const countFilters = { ...filters };

    if (!cursor) {
      return countFilters;
    }

    const andFilters = countFilters.$and;

    if (!Array.isArray(andFilters)) {
      return countFilters;
    }

    const filtersWithoutCursor = andFilters.slice(0, -1);

    if (filtersWithoutCursor.length) {
      countFilters.$and = filtersWithoutCursor;
    } else {
      delete countFilters.$and;
    }

    return countFilters;
  }

  private toCommodityView(commodity: {
    createdAt: Date | string;
    createdBy: string;
    deletedAt: Date | string | null;
    deletedBy: string | null;
    description: string;
    id: string;
    imageFileId?: string;
    imageUrl?: string;
    name: string;
    price: number;
    status: MockCommodity["status"];
    stock: number;
    tenantId?: string;
    updatedAt: Date | string;
  }): MockCommodity {
    return {
      createdAt: new Date(commodity.createdAt).toISOString(),
      createdBy: commodity.createdBy,
      deletedAt: commodity.deletedAt
        ? new Date(commodity.deletedAt).toISOString()
        : null,
      deletedBy: commodity.deletedBy,
      description: commodity.description,
      id: commodity.id,
      imageFileId: commodity.imageFileId ?? "",
      imageUrl: commodity.imageUrl ?? "",
      name: commodity.name,
      price: commodity.price,
      status: commodity.status,
      stock: commodity.stock,
      tenantId: commodity.tenantId ?? DEFAULT_TENANT_ID,
      updatedAt: new Date(commodity.updatedAt).toISOString()
    };
  }
}
