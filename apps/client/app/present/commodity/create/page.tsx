import Link from "next/link";
import { CommodityCreateForm } from "./commodity-create-form";

export default function CommodityCreatePage() {
  return (
    <section className="panel stack">
      <div>
        <p className="badge">Client Form</p>
        <h2>创建商品</h2>
        <p>表单提交到 BFF `/api/commodity/create`，成功后跳转到新商品详情页。</p>
      </div>

      <CommodityCreateForm />

      <div className="inline-actions">
        <Link className="button button--secondary" href="/present/commodity/list">
          返回列表
        </Link>
      </div>
    </section>
  );
}
