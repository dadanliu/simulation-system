"use client";

import Link from "next/link";
import { parseAppError } from "@/src/lib/app-error";

type PresentErrorProps = {
  error: Error;
  reset: () => void;
};

export default function PresentError({ error, reset }: PresentErrorProps) {
  const appError = parseAppError(error);
  const isForbidden = appError?.status === 403;
  const traceId = appError?.traceId ?? "";

  return (
    <section className="panel stack">
      <p className={`badge${isForbidden ? " badge--warning" : " badge--danger"}`}>{isForbidden ? "Forbidden" : "System Error"}</p>
      <h2>{isForbidden ? "无权限访问当前页面" : "页面加载失败"}</h2>
      <p className={isForbidden ? "" : "form-error"}>
        {appError?.message || "当前无法完成页面渲染，请稍后重试。"}
      </p>
      {traceId ? <p className="form-hint">traceId: <span className="mono-cell">{traceId}</span></p> : null}
      <div className="inline-actions">
        <button className="button" onClick={reset} type="button">
          重新加载
        </button>
        <Link className="button button--secondary" href="/present/commodity/list">
          返回商品列表
        </Link>
        <Link className="button button--secondary" href="/login">
          返回登录页
        </Link>
      </div>
    </section>
  );
}
