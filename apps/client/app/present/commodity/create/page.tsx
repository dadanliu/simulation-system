import Link from "next/link";
import { CommodityCreateForm } from "./commodity-create-form";

export default function CommodityCreatePage() {
  return (
    <div className="stack">
      <section className="panel stack">
        <div>
          <p className="badge">Client Form</p>
          <h2>创建商品</h2>
          <p>
            创建流程由 Client Component
            负责提交与跳转，页面层只负责组合表单与说明。
          </p>
        </div>

        <CommodityCreateForm />
      </section>

      <section className="panel stack">
        <div>
          <p className="badge">Product Image</p>
          <h2>上传商品图片</h2>
          <p>
            图片上传入口已合并到创建表单。先上传图片，创建商品时会保存图片元数据并在列表页展示。
          </p>
        </div>

        <div className="inline-actions">
          <Link
            className="button button--secondary"
            href="/present/commodity/list"
          >
            返回列表
          </Link>
        </div>
      </section>
    </div>
  );
}
