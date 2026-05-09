"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { CommodityImage } from "@/src/components/commodity-image";
import { clientUploadRequest } from "@/src/features/auth/client";
import { createCommodity } from "@/src/features/commodity/client";
import { getCommodityImageSizes } from "@/src/features/commodity/media";
import type { CommodityStatus } from "@/src/features/commodity/types";

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

type UploadResult = {
  fileId: string;
  mimeType: string;
  scanStatus?: "ready";
  scene: string;
  size: number;
  url: string;
};

const MAX_FILE_SIZE = 2 * 1024 * 1024;
const ALLOWED_FILE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function CommodityCreateForm() {
  const router = useRouter();
  const [form, setForm] = useState(initialFormState);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [uploadedImage, setUploadedImage] = useState<UploadResult>();

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

    if (
      !form.stock ||
      !Number.isInteger(Number(form.stock)) ||
      Number(form.stock) < 0
    ) {
      return "商品库存必须是非负整数";
    }

    return "";
  }

  function validateFile(file?: File) {
    if (!file) {
      return "请选择一个文件";
    }

    if (!ALLOWED_FILE_TYPES.has(file.type)) {
      return "仅支持 JPG、PNG、WEBP 图片";
    }

    if (file.size > MAX_FILE_SIZE) {
      return "文件大小不能超过 2MB";
    }

    return "";
  }

  async function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    setUploadedImage(undefined);
    setSelectedFileName(file?.name ?? "");

    const validationError = validateFile(file);

    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    if (!file) {
      return;
    }

    setErrorMessage("");
    setIsUploading(true);

    try {
      const formData = new FormData();

      formData.append("file", file);
      formData.append("scene", "commodity");

      const { data } = await clientUploadRequest<UploadResult>(
        "/api/upload",
        {
          body: formData,
          method: "POST"
        },
        {
          fallbackMessage: "图片上传失败，请稍后重试",
          source: "commodityCreateUpload",
          timeoutMs: 15_000
        }
      );

      setUploadedImage(data);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "图片上传失败，请稍后重试"
      );
    } finally {
      setIsUploading(false);
    }
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
      const created = await createCommodity({
        description: form.description.trim(),
        imageFileId: uploadedImage?.fileId,
        imageUrl: uploadedImage?.url,
        name: form.name.trim(),
        price: Number(form.price),
        status: form.status,
        stock: Number(form.stock)
      });

      // 创建成功后跳转详情页，便于立即确认新商品数据。
      router.push(`/present/commodity/${created.id}`);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "网络异常，请稍后重试"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="form-grid" onSubmit={handleSubmit}>
      <label className="field">
        <span>商品图片</span>
        <input
          accept="image/jpeg,image/png,image/webp"
          disabled={isSubmitting || isUploading}
          onChange={handleImageUpload}
          type="file"
        />
      </label>
      <p className="form-hint">
        限制：JPG、PNG、WEBP，最大 2MB。当前选择：
        {selectedFileName || "未选择文件"}
      </p>
      {isUploading ? <p className="form-hint">图片上传中...</p> : null}
      {uploadedImage ? (
        <div className="upload-result">
          <p className="upload-result__title">图片已上传</p>
          <CommodityImage
            alt="已上传商品图"
            className="commodity-thumb"
            height={56}
            sizes={getCommodityImageSizes("thumb")}
            src={uploadedImage.url}
            width={56}
          />
          <p>文件 ID：{uploadedImage.fileId}</p>
          <p>文件类型：{uploadedImage.mimeType}</p>
          <p>文件大小：{uploadedImage.size} bytes</p>
          <p>扫描状态：{uploadedImage.scanStatus ?? "ready"}</p>
        </div>
      ) : null}

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
          onChange={(event) =>
            updateForm("status", event.target.value as CommodityStatus)
          }
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
            setSelectedFileName("");
            setUploadedImage(undefined);
          }}
          type="button"
        >
          重置
        </button>
      </div>
    </form>
  );
}
