"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { restoreCommodity } from "@/src/features/commodity/client";

type CommodityRestoreButtonProps = {
  commodityId: string;
};

export function CommodityRestoreButton({ commodityId }: CommodityRestoreButtonProps) {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleRestore() {
    const reason = window.prompt("请输入恢复原因");

    if (reason === null) {
      return;
    }

    if (!reason.trim()) {
      setErrorMessage("请输入恢复原因");
      return;
    }

    const confirmed = window.confirm(`确认恢复商品 ${commodityId} 吗？`);

    if (!confirmed) {
      return;
    }

    setErrorMessage("");
    setIsSubmitting(true);

    try {
      await restoreCommodity(commodityId, {
        reason: reason.trim()
      });
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "商品恢复失败");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="stack">
      <button className="button button--secondary" disabled={isSubmitting} onClick={handleRestore} type="button">
        {isSubmitting ? "恢复中..." : "恢复"}
      </button>
      {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
    </div>
  );
}
