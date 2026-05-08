import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createAppError } from "@/src/lib/app-error";
import { loadClientConfig } from "@/src/config/env";
import type { CurrentUser } from "./types";

type ApiResponse<T> = {
  data?: T;
  message?: string;
  path?: string;
  success: boolean;
  statusCode?: number;
  traceId?: string;
};

const { bffBaseUrl, internalOrigin } = loadClientConfig();

async function getCookieHeader() {
  const cookieStore = await cookies();
  return cookieStore.toString();
}

export async function getCurrentUser(nextPath = "/present/commodity/list"): Promise<CurrentUser> {
  const cookie = await getCookieHeader();
  const response = await fetch(`${internalOrigin}/api/auth/me`, {
    cache: "no-store",
    headers: {
      cookie
    }
  });
  const payload = (await response.json().catch(() => null)) as ApiResponse<{ user: CurrentUser }> | null;

  if (response.status === 401) {
    const loginSearchParams = new URLSearchParams({
      next: nextPath
    });

    redirect(`/login?${loginSearchParams.toString()}`);
  }

  if (!response.ok || !payload?.success || !payload.data?.user) {
    throw createAppError({
      message:
        payload?.message ??
        `Auth API request failed with status ${response.status}. Check BFF_BASE_URL=${bffBaseUrl} and BFF availability.`,
      path: payload?.path,
      status: payload?.statusCode ?? response.status,
      traceId: payload?.traceId
    });
  }

  return payload.data.user;
}
