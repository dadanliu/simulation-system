"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { createUser } from "@/src/features/user/client";
import type { User, UserRole } from "@/src/features/user/types";

type FormState = {
  displayName: string;
  enabled: boolean;
  password: string;
  roles: UserRole[];
  username: string;
};

const roleOptions: Array<{ label: string; value: UserRole }> = [
  { label: "管理员", value: "admin" },
  { label: "运营", value: "operator" },
  { label: "只读", value: "viewer" }
];

const initialFormState: FormState = {
  displayName: "",
  enabled: true,
  password: "",
  roles: ["viewer"],
  username: ""
};

export function UserCreateForm() {
  const [form, setForm] = useState<FormState>(initialFormState);
  const [createdUser, setCreatedUser] = useState<User>();
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateForm<T extends keyof FormState>(key: T, value: FormState[T]) {
    setForm((current) => ({
      ...current,
      [key]: value
    }));
  }

  function toggleRole(role: UserRole) {
    setForm((current) => {
      const roles = current.roles.includes(role)
        ? current.roles.filter((currentRole) => currentRole !== role)
        : [...current.roles, role];

      return {
        ...current,
        roles
      };
    });
  }

  function validateForm() {
    if (!form.username.trim()) {
      return "请输入用户名";
    }

    if (!/^[a-zA-Z0-9_-]{3,32}$/.test(form.username.trim())) {
      return "用户名需为 3-32 位字母、数字、下划线或连字符";
    }

    if (!form.displayName.trim()) {
      return "请输入显示名称";
    }

    if (form.password.length < 8) {
      return "密码至少 8 位";
    }

    if (form.roles.length === 0) {
      return "至少选择一个角色";
    }

    return "";
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationError = validateForm();

    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setCreatedUser(undefined);
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const user = await createUser({
        displayName: form.displayName.trim(),
        enabled: form.enabled,
        password: form.password,
        roles: form.roles,
        username: form.username.trim()
      });

      setCreatedUser(user);
      setForm(initialFormState);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "网络异常，请稍后重试"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="form-grid" onSubmit={handleSubmit}>
      <label className="field">
        <span>用户名 *</span>
        <input
          autoComplete="username"
          disabled={isSubmitting}
          onChange={(event) => updateForm("username", event.target.value)}
          placeholder="例如 zhangsan"
          required
          value={form.username}
        />
      </label>
      <label className="field">
        <span>显示名称 *</span>
        <input
          disabled={isSubmitting}
          onChange={(event) => updateForm("displayName", event.target.value)}
          placeholder="例如 张三"
          required
          value={form.displayName}
        />
      </label>
      <label className="field">
        <span>初始密码 *</span>
        <input
          autoComplete="new-password"
          disabled={isSubmitting}
          minLength={8}
          onChange={(event) => updateForm("password", event.target.value)}
          placeholder="至少 8 位"
          required
          type="password"
          value={form.password}
        />
      </label>

      <fieldset className="fieldset">
        <legend>角色 *</legend>
        <div className="choice-grid">
          {roleOptions.map((role) => (
            <label key={role.value} className="choice">
              <input
                checked={form.roles.includes(role.value)}
                disabled={isSubmitting}
                onChange={() => toggleRole(role.value)}
                type="checkbox"
              />
              <span>{role.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="choice choice--inline">
        <input
          checked={form.enabled}
          disabled={isSubmitting}
          onChange={(event) => updateForm("enabled", event.target.checked)}
          type="checkbox"
        />
        <span>启用账号</span>
      </label>

      {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
      {createdUser ? (
        <div className="form-success stack">
          <p>用户已创建：{createdUser.displayName}</p>
          <p className="form-hint">
            ID：{createdUser.id}，用户名：{createdUser.username}，角色：
            {createdUser.roles.join(", ")}
          </p>
        </div>
      ) : null}

      <div className="inline-actions">
        <button className="button" disabled={isSubmitting} type="submit">
          {isSubmitting ? "提交中..." : "创建用户"}
        </button>
        <button
          className="button button--secondary"
          disabled={isSubmitting}
          onClick={() => {
            setCreatedUser(undefined);
            setErrorMessage("");
            setForm(initialFormState);
          }}
          type="button"
        >
          重置
        </button>
      </div>
    </form>
  );
}
