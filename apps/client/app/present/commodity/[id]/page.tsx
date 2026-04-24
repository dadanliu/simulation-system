type CommodityDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function CommodityDetailPage({
  params
}: CommodityDetailPageProps) {
  const { id } = await params;

  return (
    <section className="panel stack">
      <div>
        <p className="badge">Dynamic Route</p>
        <h2>商品详情页</h2>
        <p>当前访问的商品 ID 为 {id}。后续这里会接入详情查询、异常处理和页面级错误边界。</p>
      </div>

      <div className="card-grid">
        <article className="card">
          <p className="card__label">商品 ID</p>
          <p className="card__value">{id}</p>
        </article>
        <article className="card">
          <p className="card__label">库存</p>
          <p className="card__value">284</p>
        </article>
        <article className="card">
          <p className="card__label">状态</p>
          <p className="card__value">Draft</p>
        </article>
      </div>
    </section>
  );
}
