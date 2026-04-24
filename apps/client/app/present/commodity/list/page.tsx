import Link from "next/link";

const commodities = [
  { id: "10001", name: "北极光蓝牙音箱", price: "299", status: "上架中" },
  { id: "10002", name: "风暴机械键盘", price: "699", status: "待审核" },
  { id: "10003", name: "雾白显示器支架", price: "199", status: "已下架" }
];

export default function CommodityListPage() {
  return (
    <section className="stack">
      <div className="card-grid">
        <article className="card">
          <p className="card__label">商品总数</p>
          <p className="card__value">128</p>
        </article>
        <article className="card">
          <p className="card__label">待审核</p>
          <p className="card__value">12</p>
        </article>
        <article className="card">
          <p className="card__label">本周新增</p>
          <p className="card__value">36</p>
        </article>
      </div>

      <section className="panel stack">
        <div>
          <h2>商品列表</h2>
          <p>当前是初始化阶段的占位数据，后续会由 Server Component + BFF API 提供首屏数据。</p>
        </div>

        <div className="inline-actions">
          <Link className="button" href="/present/commodity/create">
            去创建商品
          </Link>
          <Link className="button button--secondary" href="/login">
            返回登录页
          </Link>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>商品名</th>
              <th>价格</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            {commodities.map((commodity) => (
              <tr key={commodity.id}>
                <td>{commodity.id}</td>
                <td>
                  <Link className="table-link" href={`/present/commodity/${commodity.id}`}>
                    {commodity.name}
                  </Link>
                </td>
                <td>¥{commodity.price}</td>
                <td>{commodity.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </section>
  );
}
