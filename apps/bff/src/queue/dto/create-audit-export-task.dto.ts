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

enum AuditExportAction {
  Create = "create",
  Delete = "delete",
  Restore = "restore",
  StatusChange = "status_change",
  Update = "update"
}

function toOptionalNumber(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  return Number(value);
}

export class CreateAuditExportTaskDto {
  @ApiPropertyOptional({ description: "Filter by operator user ID" })
  @IsOptional()
  @IsString()
  operator?: string;

  @ApiPropertyOptional({ description: "Filter by commodity ID" })
  @IsOptional()
  @IsString()
  targetId?: string;

  @ApiPropertyOptional({
    description: "Filter by audit action",
    enum: AuditExportAction
  })
  @IsOptional()
  @IsEnum(AuditExportAction)
  action?: AuditExportAction;

  @ApiPropertyOptional({ description: "Created-at lower bound, ISO8601" })
  @IsOptional()
  @IsISO8601()
  createdFrom?: string;

  @ApiPropertyOptional({ description: "Created-at upper bound, ISO8601" })
  @IsOptional()
  @IsISO8601()
  createdTo?: string;

  @ApiPropertyOptional({
    default: 1000,
    description: "Maximum exported rows",
    maximum: 5000
  })
  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsInt()
  @Min(1)
  @Max(5000)
  maxRows = 1000;
}

