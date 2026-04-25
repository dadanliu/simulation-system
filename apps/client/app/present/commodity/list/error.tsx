"use client";

type CommodityListErrorProps = {
  error: Error;
  reset: () => void;
};

export default function CommodityListError({ error, reset }: CommodityListErrorProps) {
  return (
    <section className="panel stack">
      <p className="badge">Error</p>
      <h2>商品列表加载失败</h2>
      <p>{error.message}</p>
      <button className="button" onClick={reset} type="button">
        重新加载
      </button>
    </section>
  );
}
