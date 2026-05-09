import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class DeleteCommodityDto {
  @ApiProperty({ description: "删除原因", example: "重复创建，确认下架后删除" })
  @IsString()
  @IsNotEmpty()
  reason!: string;
}
