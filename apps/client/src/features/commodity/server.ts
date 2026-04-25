import { cookies } from "next/headers";
import type {
  Commodity,
  CommodityListData,
  CommodityListPageData
} from "@/src/features/commodity/types";
import {
  buildCommodityListSearchParams,
  readCommodityListFilters,
  type CommoditySearchParams
} from "@/src/features/commodity/query";

type ApiResponse<T> = {
  data?: T;
  message?: string;
  success: boolean;
};

async function getCookieHeader() {
  const cookieStore = await cookies();
  return cookieStore.toString();
}

async function readApiResponse<T>(response: Response) {
  const payload = (await response.json().catch(() => null)) as ApiResponse<T> | null;

  if (!response.ok || !payload?.success || payload.data === undefined) {
    throw new Error(payload?.message ?? `Request failed with status ${response.status}`);
  }

  return payload.data;
}

export async function getCommodityListPageData(
  searchParams: CommoditySearchParams
): Promise<CommodityListPageData> {
  const filters = readCommodityListFilters(searchParams);
  const cookie = await getCookieHeader();
  const query = buildCommodityListSearchParams(filters);
  const response = await fetch(`http://127.0.0.1:3000/api/commodity/list?${query.toString()}`, {
    cache: "no-store",
    headers: {
      cookie
    }
  });
  const data = await readApiResponse<CommodityListData>(response);

  return {
    ...data,
    filters,
    totalPages: Math.max(1, Math.ceil(data.pagination.total / data.pagination.pageSize))
  };
}

export async function getCommodityDetail(id: string) {
  const cookie = await getCookieHeader();
  const response = await fetch(`http://127.0.0.1:3000/api/commodity/${encodeURIComponent(id)}`, {
    cache: "no-store",
    headers: {
      cookie
    }
  });

  return readApiResponse<Commodity>(response);
}
