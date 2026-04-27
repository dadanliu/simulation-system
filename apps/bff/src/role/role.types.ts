import type { PermissionCode } from "../permission/permission.types";

export type RoleCode = "admin" | "operator" | "viewer" | string;

export type Role = {
  code: RoleCode;
  name: string;
  description: string;
  permissions: PermissionCode[];
};
