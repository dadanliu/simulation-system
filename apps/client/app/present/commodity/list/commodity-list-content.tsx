import Link from "next/link";
import { CommodityListFiltersPanel } from "./commodity-list-filters";
import { CommodityListPagination } from "./commodity-list-pagination";
import type { CommoditySearchParams } from "@/src/features/commodity/query";
import { getCommodityListPageData } from "@/src/features/commodity/server";
import type { CommodityStatus } from "@/src/features/commodity/types";

type CommodityListContentProps = {
  searchParams: CommoditySearchParams;
};

const statusLabel: Record<CommodityStatus, string> = {
  on_sale: "上架中",
  pending: "待审核",
  offline: "已下架"
};

export async function CommodityListContent({ searchParams }: CommodityListContentProps) {
  const { filters, list, pagination, totalPages } = await getCommodityListPageData(searchParams);

  return (
    <section className="stack">
      <div className="card-grid">
        <article className="card">
          <p className="card__label">商品总数</p>
          <p className="card__value">{pagination.total}</p>
        </article>
        <article className="card">
          <p className="card__label">当前页</p>
          <p className="card__value">{pagination.page}</p>
        </article>
        <article className="card">
          <p className="card__label">每页数量</p>
          <p className="card__value">{pagination.pageSize}</p>
        </article>
      </div>

      <section className="panel stack">
        <div>
          <h2>商品列表</h2>
          <p>首屏数据由独立 Server Component 获取并渲染，筛选与分页交互交给 Client Component。</p>
        </div>

        <CommodityListFiltersPanel filters={filters} />

        <div className="inline-actions">
          <Link className="button" href="/present/commodity/create">
            去创建商品
          </Link>
          <Link className="button button--secondary" href="/login">
            返回登录页
          </Link>
        </div>

        {list.length === 0 ? (
          <div className="empty-state">
            <p className="card__label">暂无商品</p>
            <p>换一个关键词或状态重新筛选。</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>商品名</th>
                <th>价格</th>
                <th>库存</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              {list.map((commodity) => (
                <tr key={commodity.id}>
                  <td>{commodity.id}</td>
                  <td>
                    <Link className="table-link" href={`/present/commodity/${commodity.id}`}>
                      {commodity.name}
                    </Link>
                  </td>
                  <td>¥{commodity.price}</td>
                  <td>{commodity.stock}</td>
                  <td>{statusLabel[commodity.status]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <CommodityListPagination currentPage={pagination.page} filters={filters} totalPages={totalPages} />
      </section>
    </section>
  );
}
