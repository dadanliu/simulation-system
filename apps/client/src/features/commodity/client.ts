import { fetchWithCsrf } from "@/src/features/auth/client";
import type { Commodity, CommodityStatus, CreateCommodityInput, UpdateCommodityInput } from "@/src/features/commodity/types";

type CreateCommodityResponse = {
  commodity: {
    id: string;
  };
};

type ApiResponse<T> = {
  data?: T;
  message?: string;
  success: boolean;
};

export async function createCommodity(input: CreateCommodityInput) {
  const response = await fetchWithCsrf("/api/commodity/create", {
    body: JSON.stringify(input),
    headers: {
      "Content-Type": "application/json"
    },
    method: "POST"
  });
  const payload = (await response.json().catch(() => null)) as ApiResponse<CreateCommodityResponse> | null;

  if (!response.ok || !payload?.success || !payload.data) {
    throw new Error(payload?.message ?? "创建商品失败");
  }

  return payload.data.commodity;
}

type UpdateCommodityStatusResponse = {
  auditLog: unknown;
  commodity: Commodity;
};

export async function updateCommodityStatus(id: string, input: { reason: string; status: CommodityStatus }) {
  const response = await fetchWithCsrf(`/api/commodity/${encodeURIComponent(id)}/status`, {
    body: JSON.stringify(input),
    headers: {
      "Content-Type": "application/json"
    },
    method: "PATCH"
  });
  const payload = (await response.json().catch(() => null)) as ApiResponse<UpdateCommodityStatusResponse> | null;

  if (!response.ok || !payload?.success || !payload.data?.commodity) {
    throw new Error(payload?.message ?? "商品状态变更失败");
  }

  return payload.data;
}

type UpdateCommodityResponse = {
  auditLog: unknown;
  commodity: Commodity;
};

export async function updateCommodity(id: string, input: UpdateCommodityInput) {
  const response = await fetchWithCsrf(`/api/commodity/${encodeURIComponent(id)}`, {
    body: JSON.stringify(input),
    headers: {
      "Content-Type": "application/json"
    },
    method: "PATCH"
  });
  const payload = (await response.json().catch(() => null)) as ApiResponse<UpdateCommodityResponse> | null;

  if (!response.ok || !payload?.success || !payload.data?.commodity) {
    throw new Error(payload?.message ?? "商品编辑失败");
  }

  return payload.data;
}

export async function deleteCommodity(id: string) {
  const response = await fetchWithCsrf(`/api/commodity/${encodeURIComponent(id)}`, {
    method: "DELETE"
  });
  const payload = (await response.json().catch(() => null)) as ApiResponse<{ commodity: Commodity }> | null;

  if (!response.ok || !payload?.success || !payload.data?.commodity) {
    throw new Error(payload?.message ?? "商品删除失败");
  }

  return payload.data;
}
