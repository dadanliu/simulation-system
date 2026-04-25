"use client";

import Link from "next/link";

type CommodityDetailErrorProps = {
  error: Error;
  reset: () => void;
};

export default function CommodityDetailError({ error, reset }: CommodityDetailErrorProps) {
  return (
    <section className="panel stack">
      <p className="badge">Error</p>
      <h2>商品详情加载失败</h2>
      <p>{error.message}</p>
      <div className="inline-actions">
        <button className="button" onClick={reset} type="button">
          重新加载
        </button>
        <Link className="button button--secondary" href="/present/commodity/list">
          返回商品列表
        </Link>
      </div>
    </section>
  );
}
