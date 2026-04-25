"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";

type CommodityStatus = "on_sale" | "pending" | "offline";

type Commodity = {
  id: string;
};

type CreateCommodityResponse = {
  data?: Commodity;
  message?: string;
  success: boolean;
};

type FormState = {
  description: string;
  name: string;
  price: string;
  status: CommodityStatus;
  stock: string;
};

const initialFormState: FormState = {
  description: "",
  name: "",
  price: "",
  status: "pending",
  stock: ""
};

export function CommodityCreateForm() {
  const router = useRouter();
  const [form, setForm] = useState(initialFormState);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateForm<T extends keyof FormState>(key: T, value: FormState[T]) {
    setForm((current) => ({
      ...current,
      [key]: value
    }));
  }

  function validateForm() {
    if (!form.name.trim()) {
      return "请输入商品名称";
    }

    if (!form.price || Number(form.price) <= 0) {
      return "商品价格必须大于 0";
    }

    if (!form.stock || !Number.isInteger(Number(form.stock)) || Number(form.stock) < 0) {
      return "商品库存必须是非负整数";
    }

    return "";
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationError = validateForm();

    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/commodity/create", {
        body: JSON.stringify({
          description: form.description.trim(),
          name: form.name.trim(),
          price: Number(form.price),
          status: form.status,
          stock: Number(form.stock)
        }),
        headers: {
          "Content-Type": "application/json"
        },
        method: "POST"
      });

      const payload = (await response.json()) as CreateCommodityResponse;

      if (!response.ok || !payload.success || !payload.data) {
        setErrorMessage(payload.message ?? "创建商品失败");
        return;
      }

      // 创建成功后跳转详情页，便于立即确认新商品数据。
      router.push(`/present/commodity/${payload.data.id}`);
    } catch {
      setErrorMessage("网络异常，请稍后重试");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="form-grid" onSubmit={handleSubmit}>
      <label className="field">
        <span>商品名称 *</span>
        <input
          disabled={isSubmitting}
          onChange={(event) => updateForm("name", event.target.value)}
          placeholder="输入商品名称"
          required
          value={form.name}
        />
      </label>
      <label className="field">
        <span>商品价格 *</span>
        <input
          disabled={isSubmitting}
          min="0.01"
          onChange={(event) => updateForm("price", event.target.value)}
          placeholder="输入价格"
          required
          step="0.01"
          type="number"
          value={form.price}
        />
      </label>
      <label className="field">
        <span>库存 *</span>
        <input
          disabled={isSubmitting}
          min="0"
          onChange={(event) => updateForm("stock", event.target.value)}
          placeholder="输入库存"
          required
          step="1"
          type="number"
          value={form.stock}
        />
      </label>
      <label className="field">
        <span>状态 *</span>
        <select
          disabled={isSubmitting}
          onChange={(event) => updateForm("status", event.target.value as CommodityStatus)}
          required
          value={form.status}
        >
          <option value="pending">待审核</option>
          <option value="on_sale">上架中</option>
          <option value="offline">已下架</option>
        </select>
      </label>
      <label className="field">
        <span>商品描述</span>
        <textarea
          disabled={isSubmitting}
          onChange={(event) => updateForm("description", event.target.value)}
          placeholder="输入描述"
          value={form.description}
        />
      </label>

      {errorMessage ? <p className="form-error">{errorMessage}</p> : null}

      <div className="inline-actions">
        <button className="button" disabled={isSubmitting} type="submit">
          {isSubmitting ? "提交中..." : "创建商品"}
        </button>
        <button
          className="button button--secondary"
          disabled={isSubmitting}
          onClick={() => {
            setForm(initialFormState);
            setErrorMessage("");
          }}
          type="button"
        >
          重置
        </button>
      </div>
    </form>
  );
}
