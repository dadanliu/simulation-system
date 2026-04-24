import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="login-wrap">
      <section className="login-card stack">
        <div>
          <p className="badge">App Router Ready</p>
          <h1>后台登录</h1>
          <p>这是项目初始化后的登录页骨架，后续会在这里接入 cookie 会话和 BFF 登录接口。</p>
        </div>

        <div className="form-grid">
          <label className="field">
            <span>用户名</span>
            <input placeholder="admin" />
          </label>
          <label className="field">
            <span>密码</span>
            <input placeholder="••••••••" type="password" />
          </label>
        </div>

        <div className="inline-actions">
          <Link className="button" href="/present/commodity/list">
            进入演示后台
          </Link>
        </div>
      </section>
    </main>
  );
}
