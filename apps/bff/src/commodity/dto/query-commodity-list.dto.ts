import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsEnum, IsInt, IsISO8601, IsOptional, IsString, Max, Min } from "class-validator";
import type { CommodityStatus } from "../commodity.types";

export const COMMODITY_LIST_MAX_PAGE_SIZE = 100;

enum QueryCommodityStatus {
  Offline = "offline",
  OnSale = "on_sale",
  Pending = "pending"
}

enum CommodityListSortBy {
  CreatedAt = "createdAt",
  Name = "name",
  Price = "price",
  Status = "status",
  Stock = "stock"
}

enum SortOrder {
  Asc = "asc",
  Desc = "desc"
}

function toOptionalNumber(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  return Number(value);
}

export class QueryCommodityListDto {
  @ApiPropertyOptional({ description: "关键字，匹配商品名或商品ID", example: "键盘" })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({ description: "按商品状态筛选", enum: QueryCommodityStatus, example: QueryCommodityStatus.OnSale })
  @IsOptional()
  @IsEnum(QueryCommodityStatus)
  status?: CommodityStatus;

  @ApiPropertyOptional({ description: "最低价格", example: 100 })
  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsInt()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({ description: "最高价格", example: 1000 })
  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsInt()
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({ description: "最低库存", example: 1 })
  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsInt()
  @Min(0)
  minStock?: number;

  @ApiPropertyOptional({ description: "最高库存", example: 200 })
  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsInt()
  @Min(0)
  maxStock?: number;

  @ApiPropertyOptional({ description: "创建时间起点，ISO8601", example: "2026-04-01T00:00:00.000Z" })
  @IsOptional()
  @IsISO8601()
  createdFrom?: string;

  @ApiPropertyOptional({ description: "创建时间终点，ISO8601", example: "2026-04-30T23:59:59.999Z" })
  @IsOptional()
  @IsISO8601()
  createdTo?: string;

  @ApiPropertyOptional({ description: "页码，从 1 开始", example: 1, default: 1 })
  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ description: "每页数量，最大 100", example: 10, default: 10, maximum: COMMODITY_LIST_MAX_PAGE_SIZE })
  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsInt()
  @Min(1)
  @Max(COMMODITY_LIST_MAX_PAGE_SIZE)
  pageSize = 10;

  @ApiPropertyOptional({ description: "排序字段", enum: CommodityListSortBy, default: CommodityListSortBy.CreatedAt })
  @IsOptional()
  @IsEnum(CommodityListSortBy)
  sortBy: CommodityListSortBy = CommodityListSortBy.CreatedAt;

  @ApiPropertyOptional({ description: "排序方向", enum: SortOrder, default: SortOrder.Desc })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder: SortOrder = SortOrder.Desc;
}
