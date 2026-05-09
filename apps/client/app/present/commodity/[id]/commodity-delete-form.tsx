"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import { deleteCommodity } from "@/src/features/commodity/client";

type CommodityDeleteFormProps = {
  commodityId: string;
  commodityName: string;
};

export function CommodityDeleteForm({ commodityId, commodityName }: CommodityDeleteFormProps) {
  const router = useRouter();
  const [confirmText, setConfirmText] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reason, setReason] = useState("");

  async function handleDelete(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!reason.trim()) {
      setErrorMessage("请输入删除原因");
      return;
    }

    if (confirmText.trim() !== commodityName) {
      setErrorMessage("请输入完整商品名称以确认删除");
      return;
    }

    const confirmed = window.confirm(`再次确认删除商品「${commodityName}」吗？删除后列表将不可见。`);

    if (!confirmed) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      await deleteCommodity(commodityId, {
        reason: reason.trim()
      });
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
      <form className="form-grid" onSubmit={handleDelete}>
        <label className="field">
          <span>删除原因 *</span>
          <textarea
            disabled={isSubmitting}
            onChange={(event) => setReason(event.target.value)}
            placeholder="例如：重复创建，确认下架后删除"
            required
            value={reason}
          />
        </label>
        <label className="field">
          <span>输入商品名称确认 *</span>
          <input
            disabled={isSubmitting}
            onChange={(event) => setConfirmText(event.target.value)}
            placeholder={commodityName}
            required
            value={confirmText}
          />
        </label>
        <div className="inline-actions">
          <button className="button button--danger" disabled={isSubmitting} type="submit">
            {isSubmitting ? "删除中..." : "删除商品"}
          </button>
        </div>
      </form>
    </section>
  );
}
