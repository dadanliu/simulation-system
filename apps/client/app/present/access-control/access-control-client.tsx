"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { bindRolePermissions, bindUserRoles } from "@/src/features/user/client";
import type { PermissionView, RolePermissionCode, RoleView, User, UserRole } from "@/src/features/user/types";

type AccessControlClientProps = {
  currentUserId: string;
  permissions: PermissionView[];
  roles: RoleView[];
  users: User[];
};

function requestHighRiskReason(message: string) {
  const reason = window.prompt("请输入变更原因");

  if (reason === null) {
    return null;
  }

  if (!reason.trim()) {
    return "";
  }

  const confirmed = window.confirm(message);
  return confirmed ? reason.trim() : null;
}

export function AccessControlClient({ currentUserId, permissions, roles, users }: AccessControlClientProps) {
  const router = useRouter();
  const roleOptions = roles.map((role) => ({
    label: role.name,
    value: role.code as UserRole
  }));
  const [userDrafts, setUserDrafts] = useState<Record<string, UserRole[]>>(
    Object.fromEntries(users.map((user) => [user.id, user.roles]))
  );
  const [roleDrafts, setRoleDrafts] = useState<Record<string, RolePermissionCode[]>>(
    Object.fromEntries(roles.map((role) => [role.code, role.permissions]))
  );
  const [editingRoleCode, setEditingRoleCode] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [message, setMessage] = useState("");
  const [pendingUserId, setPendingUserId] = useState("");
  const [pendingRoleCode, setPendingRoleCode] = useState("");

  function toggleUserRole(userId: string, role: UserRole) {
    setUserDrafts((current) => {
      const draft = current[userId] ?? [];
      const roles = draft.includes(role) ? draft.filter((item) => item !== role) : [...draft, role];
      return {
        ...current,
        [userId]: roles
      };
    });
  }

  function toggleRolePermission(roleCode: string, permission: RolePermissionCode) {
    setRoleDrafts((current) => {
      const draft = current[roleCode] ?? [];
      const permissions = draft.includes(permission)
        ? draft.filter((item) => item !== permission)
        : [...draft, permission];

      return {
        ...current,
        [roleCode]: permissions
      };
    });
  }

  async function handleSaveUserRoles(userId: string) {
    const roles = userDrafts[userId] ?? [];
    const user = users.find((item) => item.id === userId);

    if (roles.length === 0) {
      setErrorMessage("每个用户至少需要保留一个角色");
      return;
    }

    const reason = requestHighRiskReason(`确认更新用户「${user?.username ?? userId}」的角色为：${roles.join(", ")}？`);

    if (reason === null) {
      return;
    }

    if (!reason) {
      setErrorMessage("请输入角色变更原因");
      return;
    }

    setErrorMessage("");
    setMessage("");
    setPendingUserId(userId);

    try {
      await bindUserRoles(userId, roles, reason);
      setMessage(userId === currentUserId ? "当前用户角色已更新，正在刷新页面权限。" : "用户角色已更新");
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "用户角色更新失败");
    } finally {
      setPendingUserId("");
    }
  }

  async function handleSaveRolePermissions(roleCode: string) {
    const draft = roleDrafts[roleCode] ?? [];
    const role = roles.find((item) => item.code === roleCode);

    const reason = requestHighRiskReason(`确认更新角色「${role?.name ?? roleCode}」的权限，共 ${draft.length} 项？`);

    if (reason === null) {
      return;
    }

    if (!reason) {
      setErrorMessage("请输入权限变更原因");
      return;
    }

    setErrorMessage("");
    setMessage("");
    setPendingRoleCode(roleCode);

    try {
      await bindRolePermissions(roleCode, draft, reason);
      setMessage("角色权限已更新，当前登录用户能力将重新校验。");
      setEditingRoleCode(null);
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "角色权限更新失败");
    } finally {
      setPendingRoleCode("");
    }
  }

  return (
    <section className="stack">
      <section className="panel stack">
        <div>
          <p className="badge">RBAC</p>
          <h2>权限管理</h2>
          <p>
            集中查看用户、角色和权限矩阵。用户角色变更与角色权限变更都会落到持久化数据，并在刷新后更新当前会话能力。
          </p>
        </div>

        {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
        {message ? <p className="form-success">{message}</p> : null}
      </section>

      <section className="panel stack">
        <div>
          <p className="badge">Users</p>
          <h3>用户列表与角色绑定</h3>
          <p className="form-hint">
            admin 可以直接为用户绑定角色。若修改的是当前登录用户，刷新后菜单入口会按最新权限重新计算。
          </p>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>用户名</th>
              <th>显示名称</th>
              <th>状态</th>
              <th>角色</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td className="mono-cell">{user.username}</td>
                <td>
                  {user.displayName}
                  {user.id === currentUserId ? <span className="badge badge--warning">当前用户</span> : null}
                </td>
                <td>{user.enabled ? "启用中" : "已停用"}</td>
                <td>
                  <div className="choice-grid">
                    {roleOptions.map((role) => (
                      <label key={`${user.id}-${role.value}`} className="choice">
                        <input
                          checked={(userDrafts[user.id] ?? []).includes(role.value)}
                          disabled={pendingUserId === user.id}
                          onChange={() => toggleUserRole(user.id, role.value)}
                          type="checkbox"
                        />
                        <span>{role.label}</span>
                      </label>
                    ))}
                  </div>
                </td>
                <td>
                  <button
                    className="button"
                    disabled={pendingUserId === user.id}
                    onClick={() => void handleSaveUserRoles(user.id)}
                    type="button"
                  >
                    {pendingUserId === user.id ? "提交中..." : "保存角色"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel stack">
        <div>
          <p className="badge">Matrix</p>
          <h3>角色权限矩阵</h3>
          <p className="form-hint">
            上方矩阵用于只读查看角色与权限的绑定关系。进入编辑模式后，可以针对单个角色提交权限变更。
          </p>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>权限</th>
              {roles.map((role) => (
                <th key={role.code}>{role.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {permissions.map((permission) => (
              <tr key={permission.code}>
                <td>
                  <strong>{permission.name}</strong>
                  <div className="form-hint mono-cell">{permission.code}</div>
                </td>
                {roles.map((role) => (
                  <td key={`${permission.code}-${role.code}`}>
                    {role.permissions.includes(permission.code) ? "✓" : "-"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {roles.map((role) => {
          const isEditing = editingRoleCode === role.code;
          const draft = roleDrafts[role.code] ?? [];

          return (
            <article key={role.code} className="card stack">
              <div className="access-card-header">
                <div>
                  <p className="card__label">{role.code}</p>
                  <p className="card__value access-card-title">{role.name}</p>
                  <p className="form-hint">{role.description}</p>
                </div>
                <div className="inline-actions">
                  <button
                    className="button button--secondary"
                    onClick={() => setEditingRoleCode(isEditing ? null : role.code)}
                    type="button"
                  >
                    {isEditing ? "切回只读" : "编辑权限"}
                  </button>
                  {isEditing ? (
                    <button
                      className="button"
                      disabled={pendingRoleCode === role.code}
                      onClick={() => void handleSaveRolePermissions(role.code)}
                      type="button"
                    >
                      {pendingRoleCode === role.code ? "保存中..." : "保存权限"}
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="choice-grid">
                {permissions.map((permission) => (
                  <label key={`${role.code}-${permission.code}`} className="choice">
                    <input
                      checked={draft.includes(permission.code)}
                      disabled={!isEditing || pendingRoleCode === role.code}
                      onChange={() => toggleRolePermission(role.code, permission.code)}
                      type="checkbox"
                    />
                    <span>{permission.name}</span>
                  </label>
                ))}
              </div>
            </article>
          );
        })}
      </section>
    </section>
  );
}
