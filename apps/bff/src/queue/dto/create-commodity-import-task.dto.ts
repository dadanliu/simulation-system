import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsOptional,
  ValidateNested
} from "class-validator";
import { CreateCommodityDto } from "../../commodity/dto/create-commodity.dto";

function toOptionalBoolean(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (value === true || value === "true") {
    return true;
  }

  if (value === false || value === "false") {
    return false;
  }

  return value;
}

export class CreateCommodityImportTaskDto {
  // 批量导入的商品明细；进入队列前先复用商品创建 DTO 做结构和业务字段校验。
  @ApiProperty({
    description: "Commodity records to import asynchronously",
    type: [CreateCommodityDto]
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => CreateCommodityDto)
  items!: CreateCommodityDto[];

  // dryRun 只校验和预演导入流程，不真正创建商品；支持表单/查询场景传入字符串布尔值。
  @ApiPropertyOptional({
    default: false,
    description: "Validate records without creating commodities"
  })
  @IsOptional()
  @Transform(({ value }) => toOptionalBoolean(value))
  @IsBoolean()
  dryRun = false;
}
