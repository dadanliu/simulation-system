import { serverApiRequest } from "@/src/lib/server-api";
import type { PermissionView, RoleView, User } from "./types";

export async function getUserList(nextPath = "/present/access-control") {
  const { data } = await serverApiRequest<User[]>("/api/users", {
    fallbackMessage: "用户列表加载失败",
    nextPathOnUnauthorized: nextPath
  });

  return data;
}

export async function getRoleList(nextPath = "/present/access-control") {
  const { data } = await serverApiRequest<RoleView[]>("/api/roles", {
    fallbackMessage: "角色列表加载失败",
    nextPathOnUnauthorized: nextPath
  });

  return data;
}

export async function getPermissionList(nextPath = "/present/access-control") {
  const { data } = await serverApiRequest<PermissionView[]>(
    "/api/permissions",
    {
      fallbackMessage: "权限列表加载失败",
      nextPathOnUnauthorized: nextPath
    }
  );

  return data;
}
