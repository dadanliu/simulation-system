import Link from "next/link";
import { createAppError } from "@/src/lib/app-error";
import { getCurrentUser } from "@/src/features/auth/server";
import { getCommodityAuditLogs } from "@/src/features/commodity/server";
import type { AuditLogAction } from "@/src/features/commodity/types";
import { CommodityRestoreButton } from "./commodity-restore-button";

type AuditLogPageProps = {
  searchParams: Promise<{
    action?: string | string[];
    createdFrom?: string | string[];
    createdTo?: string | string[];
    operator?: string | string[];
    page?: string | string[];
    pageSize?: string | string[];
    targetId?: string | string[];
  }>;
};

const actionLabel: Record<AuditLogAction, string> = {
  create: "创建商品",
  delete: "删除商品",
  restore: "恢复商品",
  update: "编辑商品",
  status_change: "状态变更"
};

const actionOptions: Array<{ label: string; value: AuditLogAction | "" }> = [
  { label: "全部动作", value: "" },
  { label: "创建商品", value: "create" },
  { label: "编辑商品", value: "update" },
  { label: "状态变更", value: "status_change" },
  { label: "删除商品", value: "delete" },
  { label: "恢复商品", value: "restore" }
];

function readSingleParam(value?: string | string[]) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function buildAuditSearchParams(input: {
  action?: string;
  createdFrom?: string;
  createdTo?: string;
  operator?: string;
  page?: number;
  pageSize?: string;
  targetId?: string;
}) {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      query.set(key, String(value));
    }
  }

  return query;
}

function formatDiff(value: Record<string, unknown> | null) {
  if (!value) {
    return "-";
  }

  return Object.entries(value)
    .map(([key, item]) => `${key}: ${String(item || "-")}`)
    .join("\n");
}

export const dynamic = "force-dynamic";

export default async function CommodityAuditPage({
  searchParams
}: AuditLogPageProps) {
  const resolvedSearchParams = await searchParams;
  const currentUser = await getCurrentUser("/present/commodity/audit");
  const action = readSingleParam(resolvedSearchParams.action);
  const operator = readSingleParam(resolvedSearchParams.operator);
  const targetId = readSingleParam(resolvedSearchParams.targetId);
  const createdFrom = readSingleParam(resolvedSearchParams.createdFrom);
  const createdTo = readSingleParam(resolvedSearchParams.createdTo);
  const pageSize = readSingleParam(resolvedSearchParams.pageSize) || "20";

  if (!currentUser.roles.includes("admin")) {
    throw createAppError({
      message: "审计日志只允许 admin 查看。",
      path: "/present/commodity/audit",
      status: 403
    });
  }

  const data = await getCommodityAuditLogs({
    ...resolvedSearchParams,
    pageSize
  });
  const totalPages = Math.max(
    1,
    Math.ceil(data.pagination.total / data.pagination.pageSize)
  );
  const previousQuery = buildAuditSearchParams({
    action,
    createdFrom,
    createdTo,
    operator,
    page: Math.max(1, data.pagination.page - 1),
    pageSize,
    targetId
  });
  const nextQuery = buildAuditSearchParams({
    action,
    createdFrom,
    createdTo,
    operator,
    page: Math.min(totalPages, data.pagination.page + 1),
    pageSize,
    targetId
  });

  return (
    <section className="panel stack">
      <div>
        <p className="badge">Audit</p>
        <h2>商品审计日志</h2>
        <p>
          查看商品创建、编辑、状态变更、删除和恢复的 before / after 记录，并用
          traceId 串起请求链路。
        </p>
      </div>

      <div className="inline-actions">
        <Link
          className="button button--secondary"
          href="/present/commodity/list"
        >
          返回商品列表
        </Link>
        <Link
          className="button"
          href="/present/commodity/audit?action=status_change&pageSize=20"
        >
          只看状态变更
        </Link>
      </div>

      <form className="filter-bar" method="get">
        <label className="field">
          <span>操作人</span>
          <input
            defaultValue={operator}
            name="operator"
            placeholder="u_admin_001"
          />
        </label>
        <label className="field">
          <span>动作</span>
          <select defaultValue={action} name="action">
            {actionOptions.map((option) => (
              <option key={option.value || "all"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>商品 ID</span>
          <input defaultValue={targetId} name="targetId" placeholder="10001" />
        </label>
        <label className="field">
          <span>开始时间</span>
          <input
            defaultValue={createdFrom}
            name="createdFrom"
            placeholder="2026-04-28T00:00:00.000Z"
          />
        </label>
        <label className="field">
          <span>结束时间</span>
          <input
            defaultValue={createdTo}
            name="createdTo"
            placeholder="2026-04-28T23:59:59.999Z"
          />
        </label>
        <label className="field">
          <span>每页数量</span>
          <select defaultValue={pageSize} name="pageSize">
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
          </select>
        </label>
        <div className="inline-actions">
          <button className="button" type="submit">
            筛选
          </button>
          <Link
            className="button button--secondary"
            href="/present/commodity/audit"
          >
            重置
          </Link>
        </div>
      </form>

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
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {data.list.map((log) => (
              <tr key={`${log.traceId}-${log.target.id}-${log.createdAt}`}>
                <td>{new Date(log.createdAt).toLocaleString("zh-CN")}</td>
                <td>{log.operator}</td>
                <td>{actionLabel[log.action]}</td>
                <td>
                  <Link
                    className="table-link"
                    href={`/present/commodity/${log.target.id}`}
                  >
                    {log.target.id}
                  </Link>
                </td>
                <td className="mono-cell">{formatDiff(log.before)}</td>
                <td className="mono-cell">{formatDiff(log.after)}</td>
                <td>{log.reason ?? "-"}</td>
                <td className="mono-cell">{log.traceId}</td>
                <td>
                  {log.action === "delete" ? (
                    <CommodityRestoreButton commodityId={log.target.id} />
                  ) : (
                    "-"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p className="form-hint">
        当前页 {data.pagination.page}，每页 {data.pagination.pageSize}，共{" "}
        {data.pagination.total} 条。
      </p>

      <div className="pagination-bar">
        <Link
          aria-disabled={data.pagination.page <= 1}
          className={`button button--secondary${data.pagination.page <= 1 ? " button--disabled" : ""}`}
          href={`/present/commodity/audit?${previousQuery.toString()}`}
        >
          上一页
        </Link>
        <span>
          第 {data.pagination.page} / {totalPages} 页
        </span>
        <Link
          aria-disabled={data.pagination.page >= totalPages}
          className={`button button--secondary${data.pagination.page >= totalPages ? " button--disabled" : ""}`}
          href={`/present/commodity/audit?${nextQuery.toString()}`}
        >
          下一页
        </Link>
      </div>
    </section>
  );
}
