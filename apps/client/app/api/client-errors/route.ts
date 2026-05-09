import { cookies } from "next/headers";
import { loadClientConfig } from "@/src/config/env";
import type { ApiEnvelope } from "@/src/lib/api-envelope";
import type { CurrentUser } from "@/src/features/auth/types";

const { internalOrigin } = loadClientConfig();

type ClientErrorPayload = {
  category?: string;
  message?: string;
  source?: string;
  stack?: string;
  status?: number;
  traceId?: string;
  url?: string;
};

async function readCurrentUser() {
  const cookieStore = await cookies();
  const response = await fetch(`${internalOrigin}/api/auth/me`, {
    cache: "no-store",
    headers: {
      cookie: cookieStore.toString()
    }
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json().catch(() => null)) as ApiEnvelope<{
    user: CurrentUser;
  }> | null;
  return payload?.success && payload.data?.user ? payload.data.user : null;
}

export async function POST(request: Request) {
  const payload = (await request
    .json()
    .catch(() => null)) as ClientErrorPayload | null;
  const currentUser = await readCurrentUser();

  console.error(
    JSON.stringify({
      category: payload?.category ?? "runtime",
      message: payload?.message ?? "frontend error",
      source: payload?.source ?? "unknown",
      stack: payload?.stack ?? "",
      status: payload?.status ?? 0,
      traceId: payload?.traceId ?? "",
      url: payload?.url ?? "",
      user: currentUser
        ? {
            id: currentUser.id,
            roles: currentUser.roles,
            username: currentUser.username
          }
        : null
    })
  );

  return Response.json({
    success: true
  });
}
