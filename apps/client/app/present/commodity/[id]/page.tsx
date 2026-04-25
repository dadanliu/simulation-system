import Link from "next/link";
import { getCommodityDetail } from "@/src/features/commodity/server";
import type { CommodityStatus } from "@/src/features/commodity/types";

type CommodityDetailPageProps = {
  params: Promise<{ id: string }>;
};

const statusLabel: Record<CommodityStatus, string> = {
  on_sale: "上架中",
  pending: "待审核",
  offline: "已下架"
};

export const dynamic = "force-dynamic";

export default async function CommodityDetailPage({ params }: CommodityDetailPageProps) {
  const { id } = await params;
  const commodity = await getCommodityDetail(id);

  return (
    <section className="panel stack">
      <div>
        <p className="badge">Dynamic Route</p>
        <h2>商品详情页</h2>
        <p>详情页通过商品数据访问层读取领域数据，无效 ID 会进入当前路由的错误边界。</p>
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
        {commodity.description ? <p>{commodity.description}</p> : null}
      </article>
    </section>
  );
}
