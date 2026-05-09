import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class RestoreCommodityDto {
  @ApiProperty({ description: "恢复原因", example: "误删恢复，商品信息已复核" })
  @IsString()
  @IsNotEmpty()
  reason!: string;
}
