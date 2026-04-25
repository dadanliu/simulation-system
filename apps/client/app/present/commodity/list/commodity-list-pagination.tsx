"use client";

import { useRouter } from "next/navigation";
import type { CommodityListFilters } from "@/src/features/commodity/types";
import { buildCommodityListSearchParams } from "@/src/features/commodity/query";

type CommodityListPaginationProps = {
  currentPage: number;
  filters: CommodityListFilters;
  totalPages: number;
};

export function CommodityListPagination({
  currentPage,
  filters,
  totalPages
}: CommodityListPaginationProps) {
  const router = useRouter();

  function goToPage(page: number) {
    const nextPage = Math.min(totalPages, Math.max(1, page));
    router.push(
      `/present/commodity/list?${buildCommodityListSearchParams({
        ...filters,
        page: nextPage
      }).toString()}`
    );
  }

  return (
    <div className="pagination-bar">
      <button
        aria-disabled={currentPage <= 1}
        className={`button button--secondary${currentPage <= 1 ? " button--disabled" : ""}`}
        disabled={currentPage <= 1}
        onClick={() => goToPage(currentPage - 1)}
        type="button"
      >
        上一页
      </button>
      <span>
        第 {currentPage} / {totalPages} 页
      </span>
      <button
        aria-disabled={currentPage >= totalPages}
        className={`button button--secondary${currentPage >= totalPages ? " button--disabled" : ""}`}
        disabled={currentPage >= totalPages}
        onClick={() => goToPage(currentPage + 1)}
        type="button"
      >
        下一页
      </button>
    </div>
  );
}
