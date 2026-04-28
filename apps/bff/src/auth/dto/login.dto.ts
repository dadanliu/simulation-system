import { ApiProperty } from "@nestjs/swagger";
import { IsString, MinLength } from "class-validator";

export class LoginDto {
  @ApiProperty({ description: "登录用户名", example: "admin" })
  @IsString()
  @MinLength(1)
  username!: string;

  @ApiProperty({ description: "登录密码", example: "admin123" })
  @IsString()
  @MinLength(1)
  password!: string;
}
