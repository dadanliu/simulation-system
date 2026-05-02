import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { CurrentUser } from "./types";

type ApiResponse<T> = {
  data?: T;
  message?: string;
  success: boolean;
};

const internalOrigin = process.env.NEXT_INTERNAL_ORIGIN ?? "http://127.0.0.1:3000";

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
    throw new Error(payload?.message ?? `Request failed with status ${response.status}`);
  }

  return payload.data.user;
}
