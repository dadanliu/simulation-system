import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsNotEmpty, IsString } from "class-validator";
import type { CommodityStatus } from "../commodity.types";

enum UpdateCommodityStatus {
  Offline = "offline",
  OnSale = "on_sale"
}

export class UpdateCommodityStatusDto {
  @ApiProperty({
    description: "目标状态，仅允许上下架流转",
    enum: UpdateCommodityStatus,
    example: UpdateCommodityStatus.OnSale
  })
  @IsEnum(UpdateCommodityStatus)
  status!: CommodityStatus;

  @ApiProperty({ description: "状态变更原因", example: "审核通过，允许上架" })
  @IsString()
  @IsNotEmpty()
  reason!: string;
}
