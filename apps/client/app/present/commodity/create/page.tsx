import Link from "next/link";
import { CommodityCreateForm } from "./commodity-create-form";
import { UploadDemo } from "./upload-demo";

export default function CommodityCreatePage() {
  return (
    <div className="stack">
      <section className="panel stack">
        <div>
          <p className="badge">Client Form</p>
          <h2>创建商品</h2>
          <p>表单提交到 BFF `/api/commodity/create`，成功后跳转到新商品详情页。</p>
        </div>

        <CommodityCreateForm />
      </section>

      <section className="panel stack">
        <div>
          <p className="badge">Upload Demo</p>
          <h2>上传演示</h2>
          <p>选择一张 JPG、PNG 或 WEBP 图片，通过 `formData` 提交到 BFF `/api/upload`。</p>
        </div>

        <UploadDemo />

        <div className="inline-actions">
          <Link className="button button--secondary" href="/present/commodity/list">
            返回列表
          </Link>
        </div>
      </section>
    </div>
  );
}
