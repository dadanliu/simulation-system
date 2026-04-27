import { SetMetadata } from "@nestjs/common";
import type { PermissionCode } from "./permission.types";

export const REQUIRED_PERMISSIONS_KEY = "requiredPermissions";

export const RequirePermissions = (...permissions: PermissionCode[]) =>
  SetMetadata(REQUIRED_PERMISSIONS_KEY, permissions);
