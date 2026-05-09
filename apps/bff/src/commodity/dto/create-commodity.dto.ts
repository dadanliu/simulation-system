import { ApiProperty } from "@nestjs/swagger";
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min
} from "class-validator";

enum CreateCommodityStatus {
  Offline = "offline",
  OnSale = "on_sale",
  Pending = "pending"
}

export class CreateCommodityDto {
  @ApiProperty({ description: "商品名称", example: "北极星机械键盘" })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ description: "商品价格，单位元", example: 299.9 })
  @IsNumber()
  @Min(0.01)
  price!: number;

  @ApiProperty({ description: "商品库存", example: 88 })
  @IsInt()
  @Min(0)
  stock!: number;

  @ApiProperty({
    description: "商品状态",
    enum: CreateCommodityStatus,
    example: CreateCommodityStatus.Pending
  })
  @IsEnum(CreateCommodityStatus)
  status!: CreateCommodityStatus;

  @ApiProperty({ description: "商品描述", example: "支持多设备切换的机械键盘" })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiProperty({
    description: "商品图片文件ID",
    example: "upload_10001",
    required: false
  })
  @IsOptional()
  @IsString()
  imageFileId?: string;

  @ApiProperty({
    description: "商品图片访问地址",
    example: "/uploads/commodity/example.png",
    required: false
  })
  @IsOptional()
  @IsString()
  imageUrl?: string;
}
