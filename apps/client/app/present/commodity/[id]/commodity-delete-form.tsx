"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteCommodity } from "@/src/features/commodity/client";

type CommodityDeleteFormProps = {
  commodityId: string;
  commodityName: string;
};

export function CommodityDeleteForm({ commodityId, commodityName }: CommodityDeleteFormProps) {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleDelete() {
    const confirmed = window.confirm(`确认删除商品「${commodityName}」吗？删除后列表将不可见。`);

    if (!confirmed) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      await deleteCommodity(commodityId);
      router.push("/present/commodity/list");
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "商品删除失败");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="panel stack danger-zone">
      <div>
        <p className="badge badge--danger">Admin Only</p>
        <h3>删除商品</h3>
        <p>删除会写入软删除字段和审计日志，商品将从列表查询中消失。</p>
      </div>
      {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
      <div className="inline-actions">
        <button className="button button--danger" disabled={isSubmitting} onClick={handleDelete} type="button">
          {isSubmitting ? "删除中..." : "删除商品"}
        </button>
      </div>
    </section>
  );
}
