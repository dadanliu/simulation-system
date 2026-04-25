import type { CreateCommodityInput } from "@/src/features/commodity/types";

type CreateCommodityResponse = {
  id: string;
};

type ApiResponse<T> = {
  data?: T;
  message?: string;
  success: boolean;
};

export async function createCommodity(input: CreateCommodityInput) {
  const response = await fetch("/api/commodity/create", {
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

  return payload.data;
}
