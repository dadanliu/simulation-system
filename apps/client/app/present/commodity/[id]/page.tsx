import Link from "next/link";
import Image from "next/image";
import { getCurrentUser } from "@/src/features/auth/server";
import { getCommodityDetail } from "@/src/features/commodity/server";
import type { CommodityStatus } from "@/src/features/commodity/types";
import { CommodityDeleteForm } from "./commodity-delete-form";
import { CommodityEditForm } from "./commodity-edit-form";
import { CommodityStatusForm } from "./commodity-status-form";

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
  const [commodity, currentUser] = await Promise.all([
    getCommodityDetail(id),
    getCurrentUser(`/present/commodity/${encodeURIComponent(id)}`)
  ]);
  const canUpdateCommodity = currentUser.roles.some((role) => role === "admin" || role === "operator");
  const canDeleteCommodity = currentUser.roles.includes("admin");

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
        {commodity.imageUrl ? (
          <Image
            alt={commodity.name}
            className="commodity-cover"
            height={260}
            src={commodity.imageUrl}
            unoptimized
            width={420}
          />
        ) : null}
        <h3>{commodity.name}</h3>
        <p>
          当前商品处于「{statusLabel[commodity.status]}」状态，库存数量为 {commodity.stock}。
        </p>
        {commodity.description ? <p>{commodity.description}</p> : null}
      </article>

      {canUpdateCommodity ? (
        <section className="panel stack">
          <div>
            <p className="badge">Editable</p>
            <h3>编辑商品基础信息</h3>
            <p>admin 和 operator 可以编辑名称、价格、库存、描述和商品图片，提交后会写入审计日志。</p>
          </div>
          <CommodityEditForm commodity={commodity} />
        </section>
      ) : null}

      {canUpdateCommodity ? (
        <section className="panel stack">
          <div>
            <p className="badge">Audit Trail</p>
            <h3>商品状态变更</h3>
            <p>operator 可以在这里完成审核上架或下架，提交后 BFF 会同步写入审计日志。</p>
          </div>
          <CommodityStatusForm commodityId={commodity.id} currentStatus={commodity.status} />
        </section>
      ) : null}

      {canDeleteCommodity ? <CommodityDeleteForm commodityId={commodity.id} commodityName={commodity.name} /> : null}
    </section>
  );
}
