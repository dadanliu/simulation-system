"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import type { CommodityListFilters } from "@/src/features/commodity/types";
import { buildCommodityListSearchParams } from "@/src/features/commodity/query";

type CommodityListFiltersProps = {
  filters: CommodityListFilters;
};

export function CommodityListFiltersPanel({
  filters
}: CommodityListFiltersProps) {
  const router = useRouter();
  const [form, setForm] = useState(filters);

  function updateForm<T extends keyof CommodityListFilters>(
    key: T,
    value: CommodityListFilters[T]
  ) {
    setForm((current) => ({
      ...current,
      [key]: value
    }));
  }

  function pushFilters(nextFilters: CommodityListFilters) {
    router.push(
      `/present/commodity/list?${buildCommodityListSearchParams(nextFilters).toString()}`
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    pushFilters({
      ...form,
      cursor: "",
      keyword: form.keyword.trim(),
      page: 1
    });
  }

  function handleReset() {
    const nextFilters: CommodityListFilters = {
      createdFrom: "",
      createdTo: "",
      cursor: "",
      keyword: "",
      maxPrice: "",
      maxStock: "",
      minPrice: "",
      minStock: "",
      page: 1,
      pageSize: 10,
      sortBy: "createdAt",
      sortOrder: "desc",
      status: ""
    };

    setForm(nextFilters);
    pushFilters(nextFilters);
  }

  return (
    <form className="filter-bar" onSubmit={handleSubmit}>
      <label className="field">
        <span>关键词</span>
        <input
          name="keyword"
          onChange={(event) => updateForm("keyword", event.target.value)}
          placeholder="商品名或 ID"
          type="search"
          value={form.keyword}
        />
      </label>
      <label className="field">
        <span>状态</span>
        <select
          name="status"
          onChange={(event) =>
            updateForm(
              "status",
              event.target.value as CommodityListFilters["status"]
            )
          }
          value={form.status}
        >
          <option value="">全部</option>
          <option value="on_sale">上架中</option>
          <option value="pending">待审核</option>
          <option value="offline">已下架</option>
        </select>
      </label>
      <label className="field">
        <span>最低价格</span>
        <input
          min="0"
          name="minPrice"
          onChange={(event) => updateForm("minPrice", event.target.value)}
          placeholder="0"
          step="1"
          type="number"
          value={form.minPrice}
        />
      </label>
      <label className="field">
        <span>最高价格</span>
        <input
          min="0"
          name="maxPrice"
          onChange={(event) => updateForm("maxPrice", event.target.value)}
          placeholder="1000"
          step="1"
          type="number"
          value={form.maxPrice}
        />
      </label>
      <label className="field">
        <span>最低库存</span>
        <input
          min="0"
          name="minStock"
          onChange={(event) => updateForm("minStock", event.target.value)}
          placeholder="0"
          step="1"
          type="number"
          value={form.minStock}
        />
      </label>
      <label className="field">
        <span>最高库存</span>
        <input
          min="0"
          name="maxStock"
          onChange={(event) => updateForm("maxStock", event.target.value)}
          placeholder="200"
          step="1"
          type="number"
          value={form.maxStock}
        />
      </label>
      <label className="field">
        <span>创建时间从</span>
        <input
          name="createdFrom"
          onChange={(event) => updateForm("createdFrom", event.target.value)}
          placeholder="2026-04-01T00:00:00.000Z"
          value={form.createdFrom}
        />
      </label>
      <label className="field">
        <span>创建时间到</span>
        <input
          name="createdTo"
          onChange={(event) => updateForm("createdTo", event.target.value)}
          placeholder="2026-04-30T23:59:59.999Z"
          value={form.createdTo}
        />
      </label>
      <label className="field">
        <span>排序字段</span>
        <select
          name="sortBy"
          onChange={(event) =>
            updateForm(
              "sortBy",
              event.target.value as CommodityListFilters["sortBy"]
            )
          }
          value={form.sortBy}
        >
          <option value="createdAt">创建时间</option>
          <option value="name">商品名</option>
          <option value="price">价格</option>
          <option value="stock">库存</option>
          <option value="status">状态</option>
        </select>
      </label>
      <label className="field">
        <span>排序方向</span>
        <select
          name="sortOrder"
          onChange={(event) =>
            updateForm(
              "sortOrder",
              event.target.value as CommodityListFilters["sortOrder"]
            )
          }
          value={form.sortOrder}
        >
          <option value="desc">降序</option>
          <option value="asc">升序</option>
        </select>
      </label>
      <label className="field">
        <span>每页数量</span>
        <select
          name="pageSize"
          onChange={(event) =>
            updateForm("pageSize", Number(event.target.value))
          }
          value={form.pageSize}
        >
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
      </label>
      <button className="button" type="submit">
        筛选
      </button>
      <button
        className="button button--secondary"
        onClick={handleReset}
        type="button"
      >
        重置
      </button>
    </form>
  );
}
