"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import type { CommodityListFilters } from "@/src/features/commodity/types";
import { buildCommodityListSearchParams } from "@/src/features/commodity/query";

type CommodityListFiltersProps = {
  filters: CommodityListFilters;
};

export function CommodityListFiltersPanel({ filters }: CommodityListFiltersProps) {
  const router = useRouter();
  const [keyword, setKeyword] = useState(filters.keyword);
  const [status, setStatus] = useState(filters.status);

  function pushFilters(nextFilters: CommodityListFilters) {
    router.push(`/present/commodity/list?${buildCommodityListSearchParams(nextFilters).toString()}`);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    pushFilters({
      ...filters,
      keyword: keyword.trim(),
      page: 1,
      status
    });
  }

  function handleReset() {
    setKeyword("");
    setStatus("");
    pushFilters({
      ...filters,
      keyword: "",
      page: 1,
      status: ""
    });
  }

  return (
    <form className="filter-bar" onSubmit={handleSubmit}>
      <label className="field">
        <span>关键词</span>
        <input
          name="keyword"
          onChange={(event) => setKeyword(event.target.value)}
          placeholder="商品名或 ID"
          type="search"
          value={keyword}
        />
      </label>
      <label className="field">
        <span>状态</span>
        <select name="status" onChange={(event) => setStatus(event.target.value as CommodityListFilters["status"])} value={status}>
          <option value="">全部</option>
          <option value="on_sale">上架中</option>
          <option value="pending">待审核</option>
          <option value="offline">已下架</option>
        </select>
      </label>
      <button className="button" type="submit">
        筛选
      </button>
      <button className="button button--secondary" onClick={handleReset} type="button">
        重置
      </button>
    </form>
  );
}
