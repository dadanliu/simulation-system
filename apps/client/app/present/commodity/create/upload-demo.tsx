"use client";

import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";

type UploadResult = {
  fileName: string;
  fileSize: number;
  fileType: string;
  scene: string;
  uploadId: string;
  url: string;
};

type UploadResponse = {
  data?: UploadResult;
  message?: string;
  success: boolean;
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

      const response = await fetch("/api/upload", {
        body: formData,
        method: "POST"
      });

      const payload = (await response.json()) as UploadResponse;

      if (!response.ok || !payload.success || !payload.data) {
        setErrorMessage(payload.message ?? "上传失败");
        return;
      }

      setUploaded(payload.data);
    } catch {
      setErrorMessage("网络异常，请稍后重试");
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
          <p>文件名：{uploaded.fileName}</p>
          <p>文件类型：{uploaded.fileType}</p>
          <p>文件大小：{uploaded.fileSize} bytes</p>
          <p>文件 ID：{uploaded.uploadId}</p>
          <p>访问地址：{uploaded.url}</p>
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
