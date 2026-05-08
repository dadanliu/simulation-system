import Link from "next/link";

export default function PresentNotFound() {
  return (
    <section className="panel stack">
      <p className="badge badge--warning">404</p>
      <h2>资源不存在</h2>
      <p>当前访问的页面或商品资源不存在，可能已经被删除，或者 ID 本身无效。</p>
      <div className="inline-actions">
        <Link className="button" href="/present/commodity/list">
          返回商品列表
        </Link>
        <Link className="button button--secondary" href="/present/commodity/create">
          去创建商品
        </Link>
      </div>
    </section>
  );
}
