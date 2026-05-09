"use client";

import Link from "next/link";
import { useEffect } from "react";
import { parseAppError } from "@/src/lib/app-error";
import { reportFrontendError } from "@/src/lib/client-error-report";

type CommodityDetailErrorProps = {
  error: Error;
  reset: () => void;
};

export default function CommodityDetailError({
  error,
  reset
}: CommodityDetailErrorProps) {
  const appError = parseAppError(error);

  useEffect(() => {
    void reportFrontendError({
      category: "boundary",
      message: appError?.message || error.message,
      source: "commodity/detail/error",
      stack: error.stack,
      status: appError?.status,
      traceId: appError?.traceId
    });
  }, [
    appError?.message,
    appError?.status,
    appError?.traceId,
    error.message,
    error.stack
  ]);

  return (
    <section className="panel stack">
      <p className="badge badge--danger">System Error</p>
      <h2>商品详情加载失败</h2>
      <p className="form-error">{appError?.message || error.message}</p>
      {appError?.traceId ? (
        <p className="form-hint">
          traceId: <span className="mono-cell">{appError.traceId}</span>
        </p>
      ) : null}
      <div className="inline-actions">
        <button className="button" onClick={reset} type="button">
          重新加载
        </button>
        <Link
          className="button button--secondary"
          href="/present/commodity/list"
        >
          返回商品列表
        </Link>
      </div>
    </section>
  );
}
