import { Transform } from "class-transformer";
import { IsEnum, IsInt, IsISO8601, IsOptional, IsString, Max, Min } from "class-validator";

export const AUDIT_LOG_MAX_PAGE_SIZE = 100;

enum AuditLogAction {
  Create = "create",
  Delete = "delete",
  StatusChange = "status_change"
}

function toOptionalNumber(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  return Number(value);
}

export class QueryAuditLogDto {
  @IsOptional()
  @IsString()
  operator?: string;

  @IsOptional()
  @IsEnum(AuditLogAction)
  action?: AuditLogAction;

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
  @Max(AUDIT_LOG_MAX_PAGE_SIZE)
  pageSize = 20;
}
