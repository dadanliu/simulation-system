import { UserCreateForm } from "./user-create-form";

export default function UserCreatePage() {
  return (
    <div className="stack">
      <section className="panel stack">
        <div>
          <p className="badge">Admin</p>
          <h2>创建用户</h2>
          <p>新增后台账号，提交后密码只会进入 BFF hash 流程，页面不会回显敏感字段。</p>
        </div>

        <UserCreateForm />
      </section>
    </div>
  );
}
