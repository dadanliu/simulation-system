"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import { updateCommodityStatus } from "@/src/features/commodity/client";
import { getNextCommodityStatusOptions } from "@/src/features/commodity/status-rules";
import type { CommodityStatus } from "@/src/features/commodity/types";

type CommodityStatusFormProps = {
  commodityId: string;
  currentStatus: CommodityStatus;
};

export function CommodityStatusForm({ commodityId, currentStatus }: CommodityStatusFormProps) {
  const router = useRouter();
  const options = getNextCommodityStatusOptions(currentStatus);
  const [status, setStatus] = useState<CommodityStatus>(options[0]?.value ?? currentStatus);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!reason.trim()) {
      setErrorMessage("请输入状态变更原因");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    setMessage("");

    try {
      await updateCommodityStatus(commodityId, {
        reason: reason.trim(),
        status
      });
      setMessage("状态已更新，审计日志已写入");
      setReason("");
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "状态变更失败");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (options.length === 0) {
    return <p className="form-hint">当前状态不能直接流转。offline 商品需要重新创建或走后续恢复流程。</p>;
  }

  return (
    <form className="form-grid" onSubmit={handleSubmit}>
      <label className="field">
        <span>目标状态</span>
        <select
          disabled={isSubmitting}
          onChange={(event) => setStatus(event.target.value as CommodityStatus)}
          value={status}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>变更原因 *</span>
        <textarea
          disabled={isSubmitting}
          onChange={(event) => setReason(event.target.value)}
          placeholder="例如：审核通过，允许上架"
          required
          value={reason}
        />
      </label>
      {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
      {message ? <p className="form-success">{message}</p> : null}
      <div className="inline-actions">
        <button className="button" disabled={isSubmitting} type="submit">
          {isSubmitting ? "提交中..." : "提交状态变更"}
        </button>
      </div>
    </form>
  );
}
