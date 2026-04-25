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
          <p>创建流程由 Client Component 负责提交与跳转，页面层只负责组合表单与说明。</p>
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
