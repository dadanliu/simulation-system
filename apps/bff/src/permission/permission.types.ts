export type PermissionCode =
  | "audit:read"
  | "commodity:read"
  | "commodity:create"
  | "commodity:update"
  | "commodity:delete"
  | "user:manage"
  | "role:manage"
  | "permission:manage";

export type Permission = {
  code: PermissionCode;
  name: string;
  description: string;
};
