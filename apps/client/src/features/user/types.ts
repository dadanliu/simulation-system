export type UserRole = "admin" | "operator" | "viewer";

export type User = {
  displayName: string;
  enabled: boolean;
  id: string;
  roles: UserRole[];
  username: string;
};

export type CreateUserInput = {
  displayName: string;
  enabled: boolean;
  password: string;
  roles: UserRole[];
  username: string;
};

export type RolePermissionCode =
  | "audit:read"
  | "commodity:read"
  | "commodity:create"
  | "commodity:update"
  | "commodity:delete"
  | "user:manage"
  | "role:manage"
  | "permission:manage";

export type RoleView = {
  code: string;
  description: string;
  name: string;
  permissions: RolePermissionCode[];
};

export type PermissionView = {
  code: RolePermissionCode;
  description: string;
  name: string;
};
