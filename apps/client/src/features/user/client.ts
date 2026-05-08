import { clientApiRequest } from "../auth/client";
import type { CreateUserInput, RolePermissionCode, RoleView, User, UserRole } from "./types";

export async function createUser(input: CreateUserInput) {
  const { data } = await clientApiRequest<User>(
    "/api/users",
    {
      body: JSON.stringify(input),
      headers: {
        "Content-Type": "application/json"
      },
      method: "POST"
    },
    {
      fallbackMessage: "创建用户失败",
      source: "createUser"
    }
  );

  return data;
}

export async function bindUserRoles(id: string, roles: UserRole[]) {
  const { data } = await clientApiRequest<User>(
    `/api/users/${encodeURIComponent(id)}/roles`,
    {
      body: JSON.stringify({ roles }),
      headers: {
        "Content-Type": "application/json"
      },
      method: "PUT"
    },
    {
      fallbackMessage: "用户角色更新失败",
      source: "bindUserRoles"
    }
  );

  return data;
}

export async function bindRolePermissions(code: string, permissions: RolePermissionCode[]) {
  const { data } = await clientApiRequest<RoleView>(
    `/api/roles/${encodeURIComponent(code)}/permissions`,
    {
      body: JSON.stringify({ permissions }),
      headers: {
        "Content-Type": "application/json"
      },
      method: "PUT"
    },
    {
      fallbackMessage: "角色权限更新失败",
      source: "bindRolePermissions"
    }
  );

  return data;
}
