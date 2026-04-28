import type { Permission } from "./permission.types";

export const mockPermissions: Permission[] = [
  {
    code: "audit:read",
    name: "审计日志读取",
    description: "查看商品审计日志"
  },
  {
    code: "commodity:read",
    name: "商品读取",
    description: "查看商品列表和商品详情"
  },
  {
    code: "commodity:create",
    name: "商品创建",
    description: "创建新商品"
  },
  {
    code: "commodity:update",
    name: "商品更新",
    description: "更新已有商品"
  },
  {
    code: "commodity:delete",
    name: "商品删除",
    description: "删除已有商品"
  },
  {
    code: "user:manage",
    name: "用户维护",
    description: "维护用户基础信息和用户角色绑定"
  },
  {
    code: "role:manage",
    name: "角色维护",
    description: "维护角色基础信息和角色权限绑定"
  },
  {
    code: "permission:manage",
    name: "权限维护",
    description: "维护权限点基础信息"
  }
];
