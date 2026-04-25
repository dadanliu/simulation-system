export default function CommodityListLoading() {
  return (
    <section className="panel stack">
      <p className="badge">Loading</p>
      <h2>商品列表加载中</h2>
      <div className="skeleton-list">
        <div />
        <div />
        <div />
      </div>
    </section>
  );
}
