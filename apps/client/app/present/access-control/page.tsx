import { createAppError } from "@/src/lib/app-error";
import { getCurrentUser } from "@/src/features/auth/server";
import {
  getPermissionList,
  getRoleList,
  getUserList
} from "@/src/features/user/server";
import { AccessControlClient } from "./access-control-client";

export const dynamic = "force-dynamic";

const REQUIRED_PERMISSIONS = [
  "user:manage",
  "role:manage",
  "permission:manage"
];

export default async function AccessControlPage() {
  const currentUser = await getCurrentUser("/present/access-control");

  if (
    !REQUIRED_PERMISSIONS.every((permission) =>
      currentUser.permissions?.includes(permission)
    )
  ) {
    throw createAppError({
      message: "无权限访问权限管理页",
      path: "/present/access-control",
      status: 403
    });
  }

  const [users, roles, permissions] = await Promise.all([
    getUserList("/present/access-control"),
    getRoleList("/present/access-control"),
    getPermissionList("/present/access-control")
  ]);

  return (
    <AccessControlClient
      currentUserId={currentUser.id}
      permissions={permissions}
      roles={roles}
      users={users}
    />
  );
}
