export const DEFAULT_TENANT_ID = "tenant_demo";

export type AuthUser = {
  id: string;
  permissions: string[];
  roles: string[];
  tenantId: string;
  username: string;
};

export type User = {
  displayName: string;
  enabled: boolean;
  id: string;
  roles: string[];
  tenantId: string;
  username: string;
};

export type UserRecord = User & {
  passwordHash: string;
};

export type CreateUserInput = Omit<User, "id" | "tenantId"> & {
  id?: string;
  password: string;
  tenantId?: string;
};

export type UpdateUserInput = Partial<Omit<User, "id">>;
