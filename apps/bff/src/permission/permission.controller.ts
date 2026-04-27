import { Body, Controller, Get, Param, Post, Put, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { PermissionService } from "./permission.service";
import { RequirePermissions } from "./permissions.decorator";
import { PermissionsGuard } from "./permissions.guard";
import type { Permission } from "./permission.types";

@Controller("api/permissions")
@UseGuards(AuthGuard, PermissionsGuard)
export class PermissionController {
  constructor(private readonly permissionService: PermissionService) {}

  @Get()
  @RequirePermissions("permission:manage")
  listPermissions() {
    return this.permissionService.listPermissions();
  }

  @Post()
  @RequirePermissions("permission:manage")
  createPermission(@Body() body: Permission) {
    return this.permissionService.createPermission(body);
  }

  @Put(":code")
  @RequirePermissions("permission:manage")
  updatePermission(@Param("code") code: string, @Body() body: Partial<Omit<Permission, "code">>) {
    return this.permissionService.updatePermission(code, body);
  }
}
