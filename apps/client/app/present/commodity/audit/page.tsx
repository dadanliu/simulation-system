import Link from "next/link";
import { getCurrentUser } from "@/src/features/auth/server";
import { getCommodityAuditLogs } from "@/src/features/commodity/server";
import type { AuditLogAction } from "@/src/features/commodity/types";

type AuditLogPageProps = {
  searchParams: Promise<{
    action?: string | string[];
    operator?: string | string[];
    page?: string | string[];
    pageSize?: string | string[];
  }>;
};

const actionLabel: Record<AuditLogAction, string> = {
  create: "创建商品",
  delete: "删除商品",
  update: "编辑商品",
  status_change: "状态变更"
};

function formatDiff(value: Record<string, unknown> | null) {
  if (!value) {
    return "-";
  }

  return Object.entries(value)
    .map(([key, item]) => `${key}: ${String(item || "-")}`)
    .join("\n");
}

export const dynamic = "force-dynamic";

export default async function CommodityAuditPage({ searchParams }: AuditLogPageProps) {
  const resolvedSearchParams = await searchParams;
  const currentUser = await getCurrentUser("/present/commodity/audit");

  if (!currentUser.roles.includes("admin")) {
    return (
      <section className="panel stack">
        <div>
          <p className="badge">Forbidden</p>
          <h2>无权查看审计日志</h2>
          <p>operator 可以修改商品状态并写入审计日志，但审计日志查看权限只开放给 admin。</p>
        </div>
        <div className="inline-actions">
          <Link className="button" href="/present/commodity/list">
            返回商品列表
          </Link>
        </div>
      </section>
    );
  }

  const data = await getCommodityAuditLogs({
    ...resolvedSearchParams,
    pageSize: resolvedSearchParams.pageSize ?? "20"
  });

  return (
    <section className="panel stack">
      <div>
        <p className="badge">Admin Only</p>
        <h2>商品审计日志</h2>
        <p>用于确认商品写操作是谁、何时、对哪个商品做了什么，并用 traceId 串起请求链路。</p>
      </div>

      <div className="inline-actions">
        <Link className="button button--secondary" href="/present/commodity/list">
          返回商品列表
        </Link>
        <Link className="button" href="/present/commodity/audit?action=status_change">
          只看状态变更
        </Link>
      </div>

      {data.list.length === 0 ? (
        <div className="empty-state">
          <p className="card__label">暂无审计日志</p>
          <p>完成商品创建、状态变更或删除后会在这里出现记录。</p>
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>时间</th>
              <th>操作人</th>
              <th>动作</th>
              <th>商品</th>
              <th>修改前</th>
              <th>修改后</th>
              <th>原因</th>
              <th>traceId</th>
            </tr>
          </thead>
          <tbody>
            {data.list.map((log) => (
              <tr key={`${log.traceId}-${log.target.id}-${log.createdAt}`}>
                <td>{new Date(log.createdAt).toLocaleString("zh-CN")}</td>
                <td>{log.operator}</td>
                <td>{actionLabel[log.action]}</td>
                <td>
                  <Link className="table-link" href={`/present/commodity/${log.target.id}`}>
                    {log.target.id}
                  </Link>
                </td>
                <td className="mono-cell">{formatDiff(log.before)}</td>
                <td className="mono-cell">{formatDiff(log.after)}</td>
                <td>{log.reason ?? "-"}</td>
                <td className="mono-cell">{log.traceId}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p className="form-hint">
        当前页 {data.pagination.page}，每页 {data.pagination.pageSize}，共 {data.pagination.total} 条。
      </p>
    </section>
  );
}
