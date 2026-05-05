"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { fetchWithCsrf } from "@/src/features/auth/client";
import { updateCommodity } from "@/src/features/commodity/client";
import type { Commodity } from "@/src/features/commodity/types";

type CommodityEditFormProps = {
  commodity: Commodity;
};

type FormState = {
  description: string;
  name: string;
  price: string;
  stock: string;
};

type UploadResult = {
  fileId: string;
  mimeType: string;
  scene: string;
  size: number;
  url: string;
};

type UploadResponse = {
  data?: UploadResult;
  message?: string;
  success: boolean;
};

const MAX_FILE_SIZE = 2 * 1024 * 1024;
const ALLOWED_FILE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function toInitialForm(commodity: Commodity): FormState {
  return {
    description: commodity.description,
    name: commodity.name,
    price: String(commodity.price),
    stock: String(commodity.stock)
  };
}

export function CommodityEditForm({ commodity }: CommodityEditFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() => toInitialForm(commodity));
  const [errorMessage, setErrorMessage] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [imageFileId, setImageFileId] = useState(commodity.imageFileId);
  const [imageUrl, setImageUrl] = useState(commodity.imageUrl);
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

    if (!form.stock || !Number.isInteger(Number(form.stock)) || Number(form.stock) < 0) {
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
    setMessage("");

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

      const response = await fetchWithCsrf("/api/upload", {
        body: formData,
        method: "POST"
      });
      const payload = (await response.json()) as UploadResponse;

      if (!response.ok || !payload.success || !payload.data) {
        setErrorMessage(payload.message ?? "上传失败");
        return;
      }

      setUploadedImage(payload.data);
      setImageFileId(payload.data.fileId);
      setImageUrl(payload.data.url);
    } catch {
      setErrorMessage("图片上传失败，请稍后重试");
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
    setMessage("");
    setIsSubmitting(true);

    try {
      await updateCommodity(commodity.id, {
        description: form.description.trim(),
        imageFileId,
        imageUrl,
        name: form.name.trim(),
        price: Number(form.price),
        stock: Number(form.stock)
      });

      setMessage("商品已更新，审计日志已写入");
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "商品编辑失败");
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
        限制：JPG、PNG、WEBP，最大 2MB。当前选择：{selectedFileName || "未选择新文件"}
      </p>
      {isUploading ? <p className="form-hint">图片上传中...</p> : null}
      {imageUrl ? (
        <div className="upload-result">
          <p className="upload-result__title">{uploadedImage ? "新图片已上传" : "当前商品图片"}</p>
          <Image alt={form.name || commodity.name} className="commodity-thumb" height={56} src={imageUrl} unoptimized width={56} />
          <p>文件 ID：{imageFileId || "-"}</p>
          {uploadedImage ? (
            <>
              <p>文件类型：{uploadedImage.mimeType}</p>
              <p>文件大小：{uploadedImage.size} bytes</p>
            </>
          ) : null}
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
        <span>商品描述</span>
        <textarea
          disabled={isSubmitting}
          onChange={(event) => updateForm("description", event.target.value)}
          placeholder="输入描述"
          value={form.description}
        />
      </label>

      {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
      {message ? <p className="form-success">{message}</p> : null}

      <div className="inline-actions">
        <button className="button" disabled={isSubmitting || isUploading} type="submit">
          {isSubmitting ? "保存中..." : "保存编辑"}
        </button>
        <button
          className="button button--secondary"
          disabled={isSubmitting || isUploading}
          onClick={() => {
            setForm(toInitialForm(commodity));
            setImageFileId(commodity.imageFileId);
            setImageUrl(commodity.imageUrl);
            setUploadedImage(undefined);
            setSelectedFileName("");
            setErrorMessage("");
            setMessage("");
          }}
          type="button"
        >
          恢复原值
        </button>
      </div>
    </form>
  );
}
