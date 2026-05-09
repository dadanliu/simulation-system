import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Max,
  Min
} from "class-validator";

export const AUDIT_LOG_MAX_PAGE_SIZE = 100;

enum AuditLogAction {
  Create = "create",
  Delete = "delete",
  Restore = "restore",
  Update = "update",
  StatusChange = "status_change"
}

function toOptionalNumber(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  return Number(value);
}

export class QueryAuditLogDto {
  @ApiPropertyOptional({ description: "按操作人筛选", example: "u_admin_001" })
  @IsOptional()
  @IsString()
  operator?: string;

  @ApiPropertyOptional({ description: "按对象 ID 筛选", example: "10001" })
  @IsOptional()
  @IsString()
  targetId?: string;

  @ApiPropertyOptional({
    description: "按操作类型筛选",
    enum: AuditLogAction,
    example: AuditLogAction.Create
  })
  @IsOptional()
  @IsEnum(AuditLogAction)
  action?: AuditLogAction;

  @ApiPropertyOptional({
    description: "开始时间，ISO8601",
    example: "2026-04-28T00:00:00.000Z"
  })
  @IsOptional()
  @IsISO8601()
  createdFrom?: string;

  @ApiPropertyOptional({
    description: "结束时间，ISO8601",
    example: "2026-04-28T23:59:59.999Z"
  })
  @IsOptional()
  @IsISO8601()
  createdTo?: string;

  @ApiPropertyOptional({
    description: "页码，从 1 开始",
    example: 1,
    default: 1
  })
  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({
    description: "每页数量，最大 100",
    example: 20,
    default: 20,
    maximum: AUDIT_LOG_MAX_PAGE_SIZE
  })
  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsInt()
  @Min(1)
  @Max(AUDIT_LOG_MAX_PAGE_SIZE)
  pageSize = 20;
}
