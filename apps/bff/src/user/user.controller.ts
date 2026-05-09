import { Body, Controller, Get, Param, Post, Put, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { RequirePermissions } from "../permission/permissions.decorator";
import { PermissionsGuard } from "../permission/permissions.guard";
import { BindUserRolesDto } from "./dto/bind-user-roles.dto";
import { UserService } from "./user.service";
import type { CreateUserInput, UpdateUserInput } from "./user.types";

@Controller("api/users")
@UseGuards(AuthGuard, PermissionsGuard)
@RequirePermissions("user:manage")
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  listUsers() {
    return this.userService.listUsers();
  }

  @Post()
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
