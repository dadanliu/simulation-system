import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { loadClientConfig } from "@/src/config/env";
import type { ApiEnvelope } from "@/src/lib/api-envelope";
import { createAppError } from "@/src/lib/app-error";

const { internalOrigin } = loadClientConfig();

type ServerApiRequestOptions = {
  fallbackMessage?: string;
  nextPathOnUnauthorized: string;
  onNotFound?: "notFound";
  timeoutMs?: number;
};

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

function createTimeoutSignal(timeoutMs: number, upstreamSignal?: AbortSignal) {
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(new DOMException("Request timeout", "AbortError")),
    timeoutMs
  );

  if (upstreamSignal) {
    upstreamSignal.addEventListener(
      "abort",
      () => controller.abort(upstreamSignal.reason),
      { once: true }
    );
  }

  return {
    clear: () => clearTimeout(timeoutId),
    signal: controller.signal
  };
}

async function parseEnvelope<T>(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  const rawText = await response.text().catch(() => "");

  if (!rawText) {
    return {
      envelope: null,
      rawText
    };
  }

  if (!contentType.includes("application/json")) {
    return {
      envelope: null,
      rawText: ""
    };
  }

  try {
    return {
      envelope: JSON.parse(rawText) as ApiEnvelope<T>,
      rawText
    };
  } catch {
    return {
      envelope: null,
      rawText
    };
  }
}

export async function serverApiRequest<T>(
  path: string,
  options: ServerApiRequestOptions & {
    init?: RequestInit;
  }
) {
  const cookie = await getCookieHeader();
  const upstreamSignal = options.init?.signal ?? undefined;
  const { clear, signal } = createTimeoutSignal(
    options.timeoutMs ?? 8_000,
    upstreamSignal
  );

  try {
    const response = await fetch(`${internalOrigin}${path}`, {
      ...options.init,
      cache: "no-store",
      headers: {
        ...(options.init?.headers
          ? Object.fromEntries(new Headers(options.init.headers).entries())
          : {}),
        cookie
      },
      signal
    });
    const { envelope, rawText } = await parseEnvelope<T>(response);

    if (response.status === 401) {
      redirectToLogin(options.nextPathOnUnauthorized);
    }

    if (response.status === 404 && options.onNotFound === "notFound") {
      notFound();
    }

    if (!response.ok || !envelope?.success || envelope.data === undefined) {
      throw createAppError({
        message:
          envelope?.message ||
          rawText ||
          options.fallbackMessage ||
          `Request failed with status ${response.status}`,
        path: envelope?.path ?? path,
        status: envelope?.statusCode ?? response.status,
        traceId: envelope?.traceId
      });
    }

    return {
      data: envelope.data,
      message: envelope.message ?? "",
      traceId: envelope.traceId ?? ""
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw createAppError({
        message: options.fallbackMessage || "请求超时，请稍后重试",
        path,
        status: 408
      });
    }

    throw error;
  } finally {
    clear();
  }
}
