"use client";

import Link from "next/link";

type CommodityListErrorProps = {
  error: Error;
  reset: () => void;
};

export default function CommodityListError({ error, reset }: CommodityListErrorProps) {
  return (
    <section className="panel stack">
      <p className="badge">Error</p>
      <h2>商品列表加载失败</h2>
      <p className="form-error">{error.message || "当前无法获取商品列表，请稍后重试。"}</p>
      <p className="form-hint">可以先重试当前请求，或返回登录页确认会话状态是否正常。</p>
      <div className="inline-actions">
        <button className="button" onClick={reset} type="button">
          重新加载
        </button>
        <Link className="button button--secondary" href="/login">
          返回登录页
        </Link>
      </div>
    </section>
  );
}
