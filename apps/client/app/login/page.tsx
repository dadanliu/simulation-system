"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ClientApiError, clientApiRequest } from "@/src/features/auth/client";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function getLoginErrorMessage(status: number) {
    if (status === 429) {
      return "登录失败次数过多，请稍后再试";
    }

    return "用户名或密码错误";
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await clientApiRequest(
        "/api/auth/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            username,
            password
          })
        },
        {
          fallbackMessage: "登录失败",
          redirectOnUnauthorized: false,
          retries: 0,
          source: "login"
        }
      );

      // Middleware redirects protected pages to /login?next=..., so after login we return to that original page.
      const nextPath = new URLSearchParams(window.location.search).get("next");
      const redirectPath =
        nextPath?.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/present/commodity/list";

      router.push(redirectPath);
      router.refresh();
    } catch (error) {
      if (error instanceof ClientApiError) {
        setError(getLoginErrorMessage(error.status));
        return;
      }

      setError("登录失败，请稍后重试");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="login-wrap">
      <form className="login-card stack" onSubmit={handleSubmit}>
        <div>
          <p className="badge">BFF Cookie Session</p>
          <h1>后台登录</h1>
          <p>登录成功后，BFF 会通过 `Set-Cookie` 写入 `next_bff_session`。</p>
        </div>

        <div className="form-grid">
          <label className="field">
            <span>用户名</span>
            <input
              autoComplete="username"
              name="username"
              onChange={(event) => setUsername(event.target.value)}
              placeholder="admin"
              value={username}
            />
          </label>
          <label className="field">
            <span>密码</span>
            <input
              autoComplete="current-password"
              name="password"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="admin123"
              type="password"
              value={password}
            />
          </label>
        </div>

        {error ? <p className="form-error">{error}</p> : null}

        <div className="inline-actions">
          <button className="button" disabled={isSubmitting} type="submit">
            {isSubmitting ? "登录中..." : "登录并写入 cookie"}
          </button>
        </div>
      </form>
    </main>
  );
}
