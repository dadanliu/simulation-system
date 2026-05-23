import { Body, Controller, Get, Param, Post, Put } from "@nestjs/common";
import { ApiResponse } from "@nestjs/swagger";
import { ErrorResponseDto } from "../common/swagger/error-response.dto";
import { RequirePermissions } from "../permission/permissions.decorator";
import { BindUserRolesDto } from "./dto/bind-user-roles.dto";
import { UserService } from "./user.service";
import type { CreateUserInput, UpdateUserInput } from "./user.types";

@Controller("api/users")
@RequirePermissions("user:manage")
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  listUsers() {
    return this.userService.listUsers();
  }

  @Post()
  @ApiResponse({
    status: 429,
    description: "创建用户过于频繁",
    type: ErrorResponseDto
  })
  createUser(@Body() body: CreateUserInput) {
    return this.userService.createUser(body);
  }

  @Put(":id")
  updateUser(@Param("id") id: string, @Body() body: UpdateUserInput) {
    return this.userService.updateUser(id, body);
  }

  @Put(":id/roles")
  bindRoles(@Param("id") id: string, @Body() body: BindUserRolesDto) {
    return this.userService.bindRoles(id, body.roles, body.reason);
  }
}
