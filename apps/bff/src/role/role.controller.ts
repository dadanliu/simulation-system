import { Body, Controller, Get, Param, Post, Put, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { RequirePermissions } from "../permission/permissions.decorator";
import { PermissionsGuard } from "../permission/permissions.guard";
import { BindRolePermissionsDto } from "./dto/bind-role-permissions.dto";
import { RoleService } from "./role.service";
import type { Role } from "./role.types";

@Controller("api/roles")
@UseGuards(AuthGuard, PermissionsGuard)
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Get()
  @RequirePermissions("role:manage")
  listRoles() {
    return this.roleService.listRoles();
  }

  @Post()
  @RequirePermissions("role:manage")
  createRole(@Body() body: Role) {
    return this.roleService.createRole(body);
  }

  @Put(":code")
  @RequirePermissions("role:manage")
  updateRole(@Param("code") code: string, @Body() body: Partial<Omit<Role, "code">>) {
    return this.roleService.updateRole(code, body);
  }

  @Put(":code/permissions")
  @RequirePermissions("role:manage")
  bindPermissions(@Param("code") code: string, @Body() body: BindRolePermissionsDto) {
    return this.roleService.bindPermissions(code, body.permissions, body.reason);
  }
}
