import { DEFAULT_TENANT_ID, type CreateUserInput } from "./user.types";

export const mockUsers: CreateUserInput[] = [
  {
    id: "u_admin_001",
    username: "admin",
    displayName: "系统管理员",
    password: "admin123",
    enabled: true,
    roles: ["admin"],
    tenantId: DEFAULT_TENANT_ID
  },
  {
    id: "u_operator_001",
    username: "operator",
    displayName: "商品运营",
    password: "operator123",
    enabled: true,
    roles: ["operator"],
    tenantId: DEFAULT_TENANT_ID
  },
  {
    id: "u_viewer_001",
    username: "viewer",
    displayName: "只读用户",
    password: "viewer123",
    enabled: true,
    roles: ["viewer"],
    tenantId: DEFAULT_TENANT_ID
  }
];
