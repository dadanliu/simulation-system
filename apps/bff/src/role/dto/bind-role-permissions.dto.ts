import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsNotEmpty, IsString } from "class-validator";
import type { PermissionCode } from "../../permission/permission.types";

export class BindRolePermissionsDto {
  @ApiProperty({ description: "权限 code 列表", example: ["commodity:read", "commodity:update"] })
  @IsArray()
  @IsString({ each: true })
  permissions!: PermissionCode[];

  @ApiProperty({ description: "权限变更原因", example: "运营角色需要处理商品上下架" })
  @IsString()
  @IsNotEmpty()
  reason!: string;
}
