import Link from "next/link";

export default function CommodityCreatePage() {
  return (
    <section className="panel stack">
      <div>
        <p className="badge">Client Form Placeholder</p>
        <h2>创建商品</h2>
        <p>这是创建页的基础骨架，后续可以把表单拆到 Client Component 并接入 `/api/commodity/create`。</p>
      </div>

      <form className="form-grid">
        <label className="field">
          <span>商品名称</span>
          <input placeholder="输入商品名称" />
        </label>
        <label className="field">
          <span>商品价格</span>
          <input placeholder="输入价格" />
        </label>
        <label className="field">
          <span>商品描述</span>
          <textarea placeholder="输入描述" />
        </label>
        <div className="inline-actions">
          <button className="button" type="button">
            提交占位表单
          </button>
          <button className="button button--secondary" type="reset">
            重置
          </button>
          <Link className="button button--secondary" href="/present/commodity/list">
            返回列表
          </Link>
        </div>
      </form>
    </section>
  );
}
