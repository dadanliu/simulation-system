"use client";

import Link from "next/link";
import { parseAppError } from "@/src/lib/app-error";

type CommodityListErrorProps = {
  error: Error;
  reset: () => void;
};

export default function CommodityListError({ error, reset }: CommodityListErrorProps) {
  const appError = parseAppError(error);
  const displayMessage = appError?.message || error.message;
  const isQueryError =
    appError?.status === 400 ||
    displayMessage.includes("must be") ||
    displayMessage.includes("should not") ||
    displayMessage.includes("valid");

  return (
    <section className="panel stack">
      <p className={`badge${isQueryError ? " badge--warning" : " badge--danger"}`}>{isQueryError ? "Bad Request" : "System Error"}</p>
      <h2>{isQueryError ? "筛选条件不合法" : "商品列表加载失败"}</h2>
      <p className="form-error">{displayMessage || "当前无法获取商品列表，请稍后重试。"}</p>
      {appError?.traceId ? <p className="form-hint">traceId: <span className="mono-cell">{appError.traceId}</span></p> : null}
      <p className="form-hint">
        {isQueryError ? "请检查 URL query 中的状态、页码、每页数量、排序字段或时间格式。" : "可以先重试当前请求，或返回登录页确认会话状态是否正常。"}
      </p>
      <div className="inline-actions">
        <button className="button" onClick={reset} type="button">
          重新加载
        </button>
        <Link className="button button--secondary" href="/present/commodity/list">
          清空筛选
        </Link>
        <Link className="button button--secondary" href="/login">
          返回登录页
        </Link>
      </div>
    </section>
  );
}
