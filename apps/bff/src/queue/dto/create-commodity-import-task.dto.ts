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

  @ApiPropertyOptional({
    default: false,
    description: "Validate records without creating commodities"
  })
  @IsOptional()
  @Transform(({ value }) => toOptionalBoolean(value))
  @IsBoolean()
  dryRun = false;
}

