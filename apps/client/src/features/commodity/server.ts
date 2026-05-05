import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type {
  AuditLogListData,
  Commodity,
  CommodityListData,
  CommodityListPageData
} from "@/src/features/commodity/types";
import {
  buildCommodityListRequestSearchParams,
  readCommodityListFilters,
  type CommoditySearchParams
} from "@/src/features/commodity/query";
import { loadClientConfig } from "@/src/config/env";

type ApiResponse<T> = {
  data?: T;
  message?: string;
  success: boolean;
};

const { internalOrigin } = loadClientConfig();

async function getCookieHeader() {
  const cookieStore = await cookies();
  return cookieStore.toString();
}

function redirectToLogin(nextPath: string) {
  const loginSearchParams = new URLSearchParams({
    next: nextPath
  });

  redirect(`/login?${loginSearchParams.toString()}`);
}

async function readApiResponse<T>(response: Response, nextPathOnUnauthorized: string) {
  const payload = (await response.json().catch(() => null)) as ApiResponse<T> | null;

  if (response.status === 401) {
    redirectToLogin(nextPathOnUnauthorized);
  }

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
  const query = buildCommodityListRequestSearchParams(searchParams);
  const nextPath = query.toString() ? `/present/commodity/list?${query.toString()}` : "/present/commodity/list";
  const response = await fetch(`${internalOrigin}/api/commodity/list?${query.toString()}`, {
    cache: "no-store",
    headers: {
      cookie
    }
  });
  const data = await readApiResponse<CommodityListData>(response, nextPath);

  return {
    ...data,
    filters,
    totalPages: Math.max(1, Math.ceil(data.pagination.total / data.pagination.pageSize))
  };
}

export async function getCommodityDetail(id: string) {
  const cookie = await getCookieHeader();
  const response = await fetch(`${internalOrigin}/api/commodity/${encodeURIComponent(id)}`, {
    cache: "no-store",
    headers: {
      cookie
    }
  });

  return readApiResponse<Commodity>(response, `/present/commodity/${encodeURIComponent(id)}`);
}

export async function getCommodityAuditLogs(searchParams: {
  action?: string | string[];
  operator?: string | string[];
  page?: string | string[];
  pageSize?: string | string[];
}) {
  const cookie = await getCookieHeader();
  const query = new URLSearchParams();
  const operator = Array.isArray(searchParams.operator) ? searchParams.operator[0] : searchParams.operator;
  const action = Array.isArray(searchParams.action) ? searchParams.action[0] : searchParams.action;
  const page = Array.isArray(searchParams.page) ? searchParams.page[0] : searchParams.page;
  const pageSize = Array.isArray(searchParams.pageSize) ? searchParams.pageSize[0] : searchParams.pageSize;

  if (operator) {
    query.set("operator", operator);
  }

  if (action) {
    query.set("action", action);
  }

  if (page) {
    query.set("page", page);
  }

  if (pageSize) {
    query.set("pageSize", pageSize);
  }

  const response = await fetch(`${internalOrigin}/api/commodity/audit-logs?${query.toString()}`, {
    cache: "no-store",
    headers: {
      cookie
    }
  });

  return readApiResponse<AuditLogListData>(
    response,
    query.toString() ? `/present/commodity/audit?${query.toString()}` : "/present/commodity/audit"
  );
}
