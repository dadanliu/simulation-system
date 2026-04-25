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

type CommodityDetailResponse = {
  success: boolean;
  data: Commodity;
};

type CommodityDetailPageProps = {
  params: Promise<{ id: string }>;
};

const statusLabel: Record<CommodityStatus, string> = {
  on_sale: "上架中",
  pending: "待审核",
  offline: "已下架"
};

export const dynamic = "force-dynamic";

async function getCommodityDetail(id: string) {
  const cookieStore = await cookies();

  // 详情页从 client 入口请求，由 rewrite 转发到 BFF，再由 BFF 转发到 mock backend。
  const response = await fetch(`http://127.0.0.1:3000/api/commodity/${encodeURIComponent(id)}`, {
    cache: "no-store",
    headers: {
      cookie: cookieStore.toString()
    }
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(payload?.message ?? `商品详情加载失败：${response.status}`);
  }

  const payload = (await response.json()) as CommodityDetailResponse;
  return payload.data;
}

export default async function CommodityDetailPage({ params }: CommodityDetailPageProps) {
  const { id } = await params;
  const commodity = await getCommodityDetail(id);

  return (
    <section className="panel stack">
      <div>
        <p className="badge">Dynamic Route</p>
        <h2>商品详情页</h2>
        <p>详情数据由 BFF `/api/commodity/:id` 获取，无效 ID 会进入当前路由的错误边界。</p>
      </div>

      <div className="inline-actions">
        <Link className="button" href="/present/commodity/list">
          返回商品列表
        </Link>
        <Link className="button button--secondary" href="/present/commodity/create">
          去创建商品
        </Link>
      </div>

      <div className="card-grid">
        <article className="card">
          <p className="card__label">商品 ID</p>
          <p className="card__value">{commodity.id}</p>
        </article>
        <article className="card">
          <p className="card__label">价格</p>
          <p className="card__value">¥{commodity.price}</p>
        </article>
        <article className="card">
          <p className="card__label">库存</p>
          <p className="card__value">{commodity.stock}</p>
        </article>
        <article className="card">
          <p className="card__label">状态</p>
          <p className="card__value">{statusLabel[commodity.status]}</p>
        </article>
      </div>

      <article className="detail-card">
        <p className="card__label">商品名称</p>
        <h3>{commodity.name}</h3>
        <p>
          当前商品处于「{statusLabel[commodity.status]}」状态，库存数量为 {commodity.stock}。
        </p>
      </article>
    </section>
  );
}
