import { IsEnum, IsInt, IsNotEmpty, IsNumber, IsString, Min } from "class-validator";

enum CreateCommodityStatus {
  Offline = "offline",
  OnSale = "on_sale",
  Pending = "pending"
}

export class CreateCommodityDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsNumber()
  @Min(0.01)
  price!: number;

  @IsInt()
  @Min(0)
  stock!: number;

  @IsEnum(CreateCommodityStatus)
  status!: CreateCommodityStatus;

  @IsString()
  @IsNotEmpty()
  description!: string;
}
