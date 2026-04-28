import type { Role } from "./role.types";

export const mockRoles: Role[] = [
  {
    code: "admin",
    name: "管理员",
    description: "系统管理员，拥有用户、角色、权限和商品全部操作权限",
    permissions: [
      "audit:read",
      "commodity:read",
      "commodity:create",
      "commodity:update",
      "commodity:delete",
      "user:manage",
      "role:manage",
      "permission:manage"
    ]
  },
  {
    code: "operator",
    name: "运营",
    description: "商品运营人员，可读取、创建和更新商品",
    permissions: ["commodity:read", "commodity:create", "commodity:update"]
  },
  {
    code: "viewer",
    name: "只读用户",
    description: "只读访问商品信息",
    permissions: ["commodity:read"]
  }
];
