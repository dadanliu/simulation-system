"use client";

import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { clientUploadRequest } from "@/src/features/auth/client";

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

export function UploadDemo() {
  const [errorMessage, setErrorMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [uploaded, setUploaded] = useState<UploadResult>();

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    setUploaded(undefined);
    setErrorMessage("");
    setSelectedFileName(file?.name ?? "");
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const fileInput = event.currentTarget.elements.namedItem("file");

    if (!(fileInput instanceof HTMLInputElement)) {
      setErrorMessage("文件输入控件不可用");
      return;
    }

    const file = fileInput.files?.[0];
    const validationError = validateFile(file);

    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    if (!file) {
      setErrorMessage("请选择一个文件");
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
          fallbackMessage: "上传失败",
          source: "uploadDemo",
          timeoutMs: 15_000
        }
      );

      setUploaded(data);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "网络异常，请稍后重试");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <form className="form-grid" onSubmit={handleSubmit}>
      <label className="field">
        <span>商品图片 *</span>
        <input
          accept="image/jpeg,image/png,image/webp"
          disabled={isUploading}
          name="file"
          onChange={handleFileChange}
          type="file"
        />
      </label>

      <p className="form-hint">限制：JPG、PNG、WEBP，最大 2MB。当前选择：{selectedFileName || "未选择文件"}</p>

      {errorMessage ? <p className="form-error">{errorMessage}</p> : null}

      {uploaded ? (
        <div className="upload-result">
          <p className="upload-result__title">上传成功</p>
          <p>文件类型：{uploaded.mimeType}</p>
          <p>文件大小：{uploaded.size} bytes</p>
          <p>文件 ID：{uploaded.fileId}</p>
          <p>访问地址：{uploaded.url}</p>
          <p>扫描状态：{uploaded.scanStatus ?? "ready"}</p>
          <p>上传场景：{uploaded.scene}</p>
        </div>
      ) : null}

      <div className="inline-actions">
        <button className="button" disabled={isUploading} type="submit">
          {isUploading ? "上传中..." : "上传文件"}
        </button>
      </div>
    </form>
  );
}
