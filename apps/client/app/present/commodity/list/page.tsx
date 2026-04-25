import { cookies } from "next/headers";
import Link from "next/link";

type CommodityStatus = "on_sale" | "pending" | "offline";

type Commodity = {
  id: string;
  name: string;
  price: number;
  status: CommodityStatus;
  stock: number;
};

type CommodityListData = {
  list: Commodity[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
};

type CommodityListResponse = {
  success: boolean;
  data: CommodityListData;
};

type CommodityListPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const statusLabel: Record<CommodityStatus, string> = {
  on_sale: "上架中",
  pending: "待审核",
  offline: "已下架"
};

export const dynamic = "force-dynamic";

function firstSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function buildCommodityListQuery(searchParams: Record<string, string | string[] | undefined>) {
  const query = new URLSearchParams();
  const page = firstSearchParam(searchParams.page) ?? "1";
  const pageSize = firstSearchParam(searchParams.pageSize) ?? "10";
  const keyword = firstSearchParam(searchParams.keyword);
  const status = firstSearchParam(searchParams.status);

  query.set("page", page);
  query.set("pageSize", pageSize);

  if (keyword) {
    query.set("keyword", keyword);
  }

  if (status) {
    query.set("status", status);
  }

  return query;
}

async function getCommodityList(searchParams: Record<string, string | string[] | undefined>) {
  const cookieStore = await cookies();
  const query = buildCommodityListQuery(searchParams);

  // Server Component 请求 client 入口，由 Next rewrite 转发到 BFF。
  const response = await fetch(`http://127.0.0.1:3000/api/commodity/list?${query.toString()}`, {
    cache: "no-store",
    headers: {
      cookie: cookieStore.toString()
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to load commodity list: ${response.status}`);
  }

  const payload = (await response.json()) as CommodityListResponse;
  return payload.data;
}

function buildPageHref(searchParams: Record<string, string | string[] | undefined>, page: number) {
  const query = buildCommodityListQuery(searchParams);
  query.set("page", String(page));
  return `/present/commodity/list?${query.toString()}`;
}

export default async function CommodityListPage({ searchParams }: CommodityListPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const data = await getCommodityList(resolvedSearchParams);
  const { list, pagination } = data;

  // 筛选和分页由 URL query 驱动，刷新和分享链接时状态不会丢。
  const totalPages = Math.max(1, Math.ceil(pagination.total / pagination.pageSize));
  const keyword = firstSearchParam(resolvedSearchParams.keyword) ?? "";
  const status = firstSearchParam(resolvedSearchParams.status) ?? "";

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
          <p>首屏数据由 Server Component 调用 BFF `/api/commodity/list` 获取，BFF 再聚合 mock backend。</p>
        </div>

        <form className="filter-bar" action="/present/commodity/list">
          <label className="field">
            <span>关键词</span>
            <input name="keyword" placeholder="商品名或 ID" type="search" defaultValue={keyword} />
          </label>
          <label className="field">
            <span>状态</span>
            <select name="status" defaultValue={status}>
              <option value="">全部</option>
              <option value="on_sale">上架中</option>
              <option value="pending">待审核</option>
              <option value="offline">已下架</option>
            </select>
          </label>
          <input name="page" type="hidden" value="1" />
          <input name="pageSize" type="hidden" value={String(pagination.pageSize)} />
          <button className="button" type="submit">
            筛选
          </button>
          <Link className="button button--secondary" href="/present/commodity/list">
            重置
          </Link>
        </form>

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

        <div className="pagination-bar">
          <Link
            aria-disabled={pagination.page <= 1}
            className={`button button--secondary${pagination.page <= 1 ? " button--disabled" : ""}`}
            href={buildPageHref(resolvedSearchParams, Math.max(1, pagination.page - 1))}
          >
            上一页
          </Link>
          <span>
            第 {pagination.page} / {totalPages} 页
          </span>
          <Link
            aria-disabled={pagination.page >= totalPages}
            className={`button button--secondary${pagination.page >= totalPages ? " button--disabled" : ""}`}
            href={buildPageHref(resolvedSearchParams, Math.min(totalPages, pagination.page + 1))}
          >
            下一页
          </Link>
        </div>
      </section>
    </section>
  );
}
