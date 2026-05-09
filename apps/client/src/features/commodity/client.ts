import { clientApiRequest } from "@/src/features/auth/client";
import type {
  Commodity,
  CommodityStatus,
  CreateCommodityInput,
  UpdateCommodityInput
} from "@/src/features/commodity/types";

type CreateCommodityResponse = {
  commodity: {
    id: string;
  };
};

export async function createCommodity(input: CreateCommodityInput) {
  const { data } = await clientApiRequest<CreateCommodityResponse>(
    "/api/commodity/create",
    {
      body: JSON.stringify(input),
      headers: {
        "Content-Type": "application/json"
      },
      method: "POST"
    },
    {
      fallbackMessage: "创建商品失败",
      source: "createCommodity"
    }
  );

  return data.commodity;
}

type UpdateCommodityStatusResponse = {
  auditLog: unknown;
  commodity: Commodity;
};

export async function updateCommodityStatus(id: string, input: { reason: string; status: CommodityStatus }) {
  const { data } = await clientApiRequest<UpdateCommodityStatusResponse>(
    `/api/commodity/${encodeURIComponent(id)}/status`,
    {
      body: JSON.stringify(input),
      headers: {
        "Content-Type": "application/json"
      },
      method: "PATCH"
    },
    {
      fallbackMessage: "商品状态变更失败",
      source: "updateCommodityStatus"
    }
  );

  return data;
}

type UpdateCommodityResponse = {
  auditLog: unknown;
  commodity: Commodity;
};

export async function updateCommodity(id: string, input: UpdateCommodityInput) {
  const { data } = await clientApiRequest<UpdateCommodityResponse>(
    `/api/commodity/${encodeURIComponent(id)}`,
    {
      body: JSON.stringify(input),
      headers: {
        "Content-Type": "application/json"
      },
      method: "PATCH"
    },
    {
      fallbackMessage: "商品编辑失败",
      source: "updateCommodity"
    }
  );

  return data;
}

export async function deleteCommodity(id: string, input: { reason: string }) {
  const { data } = await clientApiRequest<{ commodity: Commodity }>(
    `/api/commodity/${encodeURIComponent(id)}`,
    {
      body: JSON.stringify(input),
      headers: {
        "Content-Type": "application/json"
      },
      method: "DELETE"
    },
    {
      fallbackMessage: "商品删除失败",
      source: "deleteCommodity"
    }
  );

  return data;
}

export async function restoreCommodity(id: string, input: { reason: string }) {
  const { data } = await clientApiRequest<{ commodity: Commodity }>(
    `/api/commodity/${encodeURIComponent(id)}/restore`,
    {
      body: JSON.stringify(input),
      headers: {
        "Content-Type": "application/json"
      },
      method: "PATCH"
    },
    {
      fallbackMessage: "商品恢复失败",
      source: "restoreCommodity"
    }
  );

  return data;
}
