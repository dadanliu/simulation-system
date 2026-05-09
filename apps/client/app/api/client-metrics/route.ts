import { cookies } from "next/headers";
import { loadClientConfig } from "@/src/config/env";
import type { CurrentUser } from "@/src/features/auth/types";
import type { ApiEnvelope } from "@/src/lib/api-envelope";

const { appVersion: serverAppVersion, internalOrigin } = loadClientConfig();

type ClientMetricPayload = {
  appVersion?: string;
  delta?: number;
  id?: string;
  name?: string;
  navigationType?: string;
  page?: string;
  rating?: string;
  url?: string;
  userAgent?: string;
  value?: number;
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

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export async function POST(request: Request) {
  const payload = (await request
    .json()
    .catch(() => null)) as ClientMetricPayload | null;
  const currentUser = await readCurrentUser();
  const metricName = payload?.name ?? "unknown";

  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: "info",
      service: "client",
      context: "ClientMetrics",
      event: "web_vital_metric",
      appVersion: payload?.appVersion ?? serverAppVersion,
      metricId: payload?.id ?? "",
      metricName,
      metricValue: readNumber(payload?.value),
      metricDelta: readNumber(payload?.delta),
      metricRating: payload?.rating ?? "",
      navigationType: payload?.navigationType ?? "",
      page: payload?.page ?? "",
      url: payload?.url ?? "",
      userAgent: payload?.userAgent ?? "",
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
