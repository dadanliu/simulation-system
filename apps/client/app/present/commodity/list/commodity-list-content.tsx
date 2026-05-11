import Link from "next/link";
import { CommodityListFiltersPanel } from "./commodity-list-filters";
import { CommodityListPagination } from "./commodity-list-pagination";
import { CommodityImage } from "@/src/components/commodity-image";
import { getCommodityImageSizes } from "@/src/features/commodity/media";
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

const sortLabel = {
  asc: "升序",
  createdAt: "创建时间",
  desc: "降序",
  name: "商品名",
  price: "价格",
  status: "状态",
  stock: "库存"
};

const queryCostLabel = {
  high: "高",
  low: "低",
  medium: "中"
};

export async function CommodityListContent({
  searchParams
}: CommodityListContentProps) {
  const { filters, list, pagination, queryPlan, sharding, totalPages } =
    await getCommodityListPageData(searchParams);

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
        <article className="card">
          <p className="card__label">当前排序</p>
          <p className="card__value">
            {sortLabel[filters.sortBy]} {sortLabel[filters.sortOrder]}
          </p>
        </article>
        <article className="card">
          <p className="card__label">查询路由</p>
          <p className="card__value">
            {sharding
              ? sharding.routingMode === "targeted"
                ? "定向分片"
                : "跨分片"
              : "-"}
          </p>
        </article>
        <article className="card">
          <p className="card__label">分片</p>
          <p className="card__value">{sharding?.shardName ?? "-"}</p>
        </article>
        <article className="card">
          <p className="card__label">租户标识</p>
          <p className="card__value">{sharding?.tenantHash ?? "-"}</p>
        </article>
        <article className="card">
          <p className="card__label">候选索引</p>
          <p className="card__value mono-cell">
            {queryPlan?.candidateIndex ?? "-"}
          </p>
        </article>
        <article className="card">
          <p className="card__label">查询成本</p>
          <p className="card__value">
            {queryPlan ? queryCostLabel[queryPlan.costLevel] : "-"}
          </p>
        </article>
        <article className="card">
          <p className="card__label">未覆盖条件</p>
          <p className="card__value mono-cell">
            {queryPlan?.unsupportedFilters.length
              ? queryPlan.unsupportedFilters.join(", ")
              : "无"}
          </p>
        </article>
      </div>

      <section className="panel stack">
        <div>
          <h2>商品列表</h2>
          <p>
            首屏数据由独立 Server Component 获取并渲染，筛选与分页交互交给
            Client Component。
          </p>
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
            <p>
              当前筛选条件没有匹配结果，可以放宽关键词、状态、价格、库存或时间范围。
            </p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>图片</th>
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
                  <td>
                    <CommodityImage
                      alt={commodity.name}
                      className={`commodity-thumb${commodity.imageUrl ? "" : " commodity-thumb--empty"}`}
                      height={56}
                      sizes={getCommodityImageSizes("thumb")}
                      src={commodity.imageUrl}
                      width={56}
                    />
                  </td>
                  <td>{commodity.id}</td>
                  <td>
                    <Link
                      className="table-link"
                      href={`/present/commodity/${commodity.id}`}
                    >
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

        <CommodityListPagination
          currentPage={pagination.page}
          filters={filters}
          nextCursor={pagination.nextCursor}
          totalPages={totalPages}
        />
      </section>
    </section>
  );
}
