import { IsEnum, IsNotEmpty, IsString } from "class-validator";
import type { CommodityStatus } from "../commodity.types";

enum UpdateCommodityStatus {
  OnSale = "on_sale"
}

export class UpdateCommodityStatusDto {
  @IsEnum(UpdateCommodityStatus)
  status!: CommodityStatus;

  @IsString()
  @IsNotEmpty()
  reason!: string;
}
