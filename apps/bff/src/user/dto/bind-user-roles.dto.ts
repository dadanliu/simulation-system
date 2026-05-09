import { ApiProperty } from "@nestjs/swagger";
import { ArrayNotEmpty, IsArray, IsNotEmpty, IsString } from "class-validator";

export class BindUserRolesDto {
  @ApiProperty({ description: "目标角色 code 列表", example: ["operator"] })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  roles!: string[];

  @ApiProperty({
    description: "角色变更原因",
    example: "岗位调整，需要商品运营权限"
  })
  @IsString()
  @IsNotEmpty()
  reason!: string;
}
