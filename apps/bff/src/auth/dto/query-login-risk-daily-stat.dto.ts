import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  IsInt,
  IsOptional,
  Matches,
  Max,
  Min
} from "class-validator";

export const LOGIN_RISK_DAILY_STAT_MAX_PAGE_SIZE = 100;

function toOptionalNumber(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  return Number(value);
}

export class QueryLoginRiskDailyStatDto {
  @ApiPropertyOptional({
    description: "开始日期，UTC 日期，格式 YYYY-MM-DD",
    example: "2026-05-01"
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dateFrom?: string;

  @ApiPropertyOptional({
    description: "结束日期，UTC 日期，格式 YYYY-MM-DD",
    example: "2026-05-22"
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dateTo?: string;

  @ApiPropertyOptional({
    default: 1,
    description: "页码，从 1 开始",
    example: 1
  })
  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({
    default: 20,
    description: "每页数量，最大 100",
    example: 20,
    maximum: LOGIN_RISK_DAILY_STAT_MAX_PAGE_SIZE
  })
  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsInt()
  @Min(1)
  @Max(LOGIN_RISK_DAILY_STAT_MAX_PAGE_SIZE)
  pageSize = 20;
}
