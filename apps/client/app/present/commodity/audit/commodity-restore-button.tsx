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
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      await restoreCommodity(commodityId);
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
