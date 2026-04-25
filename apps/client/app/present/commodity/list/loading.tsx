export default function CommodityListLoading() {
  return (
    <section className="stack">
      <div className="card-grid">
        <article className="card">
          <p className="card__label">商品总数</p>
          <p className="card__value">...</p>
        </article>
        <article className="card">
          <p className="card__label">当前页</p>
          <p className="card__value">...</p>
        </article>
        <article className="card">
          <p className="card__label">每页数量</p>
          <p className="card__value">...</p>
        </article>
      </div>

      <section className="panel stack">
        <div>
          <p className="badge">Loading</p>
          <h2>商品列表加载中</h2>
          <p className="form-hint">正在获取首屏数据，请稍候。</p>
        </div>

        <div className="skeleton-list">
          <div />
          <div />
          <div />
          <div />
        </div>
      </section>
    </section>
  );
}
