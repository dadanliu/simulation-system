import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsEnum, IsISO8601, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export const LOGIN_AUDIT_LOG_MAX_PAGE_SIZE = 100;

enum LoginAuditLogOutcome {
  Blocked = "blocked",
  Failure = "failure",
  Success = "success"
}

function toOptionalNumber(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  return Number(value);
}

export class QueryLoginAuditLogDto {
  @ApiPropertyOptional({ description: "按用户名筛选", example: "admin" })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiPropertyOptional({ description: "按用户 ID 筛选", example: "u_admin_001" })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: "按登录结果筛选", enum: LoginAuditLogOutcome, example: LoginAuditLogOutcome.Failure })
  @IsOptional()
  @IsEnum(LoginAuditLogOutcome)
  outcome?: LoginAuditLogOutcome;

  @ApiPropertyOptional({ description: "开始时间，ISO8601", example: "2026-05-04T00:00:00.000Z" })
  @IsOptional()
  @IsISO8601()
  createdFrom?: string;

  @ApiPropertyOptional({ description: "结束时间，ISO8601", example: "2026-05-04T23:59:59.999Z" })
  @IsOptional()
  @IsISO8601()
  createdTo?: string;

  @ApiPropertyOptional({ description: "页码，从 1 开始", example: 1, default: 1 })
  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({
    description: "每页数量，最大 100",
    example: 20,
    default: 20,
    maximum: LOGIN_AUDIT_LOG_MAX_PAGE_SIZE
  })
  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsInt()
  @Min(1)
  @Max(LOGIN_AUDIT_LOG_MAX_PAGE_SIZE)
  pageSize = 20;
}
