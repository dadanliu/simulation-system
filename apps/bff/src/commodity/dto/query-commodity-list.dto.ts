import { Transform } from "class-transformer";
import { IsEnum, IsInt, IsISO8601, IsOptional, IsString, Min } from "class-validator";
import type { CommodityStatus } from "../commodity.types";

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
  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsEnum(QueryCommodityStatus)
  status?: CommodityStatus;

  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsInt()
  @Min(0)
  minPrice?: number;

  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsInt()
  @Min(0)
  maxPrice?: number;

  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsInt()
  @Min(0)
  minStock?: number;

  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsInt()
  @Min(0)
  maxStock?: number;

  @IsOptional()
  @IsISO8601()
  createdFrom?: string;

  @IsOptional()
  @IsISO8601()
  createdTo?: string;

  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsInt()
  @Min(1)
  pageSize = 10;

  @IsOptional()
  @IsEnum(CommodityListSortBy)
  sortBy: CommodityListSortBy = CommodityListSortBy.CreatedAt;

  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder: SortOrder = SortOrder.Desc;
}
