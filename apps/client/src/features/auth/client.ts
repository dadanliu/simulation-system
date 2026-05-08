"use client";

import type { ApiEnvelope } from "@/src/lib/api-envelope";
import { reportFrontendError } from "@/src/lib/client-error-report";

const CSRF_COOKIE_NAME = "next_bff_csrf";
const CSRF_HEADER_NAME = "x-csrf-token";
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const DEFAULT_TIMEOUT_MS = 8_000;

type CsrfResponse = ApiEnvelope<{
  csrfToken?: string;
}>;

type FetchWithCsrfOptions = {
  redirectOnUnauthorized?: boolean;
};

type ClientApiRequestOptions = FetchWithCsrfOptions & {
  fallbackMessage?: string;
  retries?: number;
  source: string;
  timeoutMs?: number;
};

export class ClientApiError extends Error {
  category: "http" | "network" | "parse" | "timeout";
  status: number;
  traceId: string;
  url: string;

  constructor(
    message: string,
    input: {
      category: "http" | "network" | "parse" | "timeout";
      status?: number;
      traceId?: string;
      url: string;
    }
  ) {
    super(message);
    this.name = "ClientApiError";
    this.category = input.category;
    this.status = input.status ?? 0;
    this.traceId = input.traceId ?? "";
    this.url = input.url;
  }
}

function readCookie(name: string) {
  if (typeof document === "undefined") {
    return "";
  }

  const cookie = document.cookie
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${name}=`));

  if (!cookie) {
    return "";
  }

  return decodeURIComponent(cookie.slice(name.length + 1));
}

function redirectToLogin() {
  if (typeof window === "undefined") {
    return;
  }

  const next = `${window.location.pathname}${window.location.search}`;
  window.location.assign(`/login?next=${encodeURIComponent(next)}`);
}

function buildUrlString(input: RequestInfo | URL) {
  return typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
}

function createTimeoutSignal(timeoutMs: number, upstreamSignal?: AbortSignal) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(new DOMException("Request timeout", "AbortError")), timeoutMs);

  if (upstreamSignal) {
    upstreamSignal.addEventListener("abort", () => controller.abort(upstreamSignal.reason), { once: true });
  }

  return {
    clear: () => window.clearTimeout(timeoutId),
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

function createParseError(url: string, fallbackMessage?: string) {
  return new ClientApiError(fallbackMessage || "服务响应格式错误，请稍后重试", {
    category: "parse",
    status: 502,
    url
  });
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export async function ensureCsrfToken() {
  const existingToken = readCookie(CSRF_COOKIE_NAME);

  if (existingToken) {
    return existingToken;
  }

  const response = await fetch("/api/auth/csrf", {
    cache: "no-store",
    credentials: "same-origin"
  });
  const payload = (await response.json().catch(() => null)) as CsrfResponse | null;

  if (!response.ok || !payload?.success) {
    throw new Error(payload?.message ?? "获取 CSRF token 失败");
  }

  const token = readCookie(CSRF_COOKIE_NAME) || payload.data?.csrfToken || "";

  if (!token) {
    throw new Error("CSRF token missing");
  }

  return token;
}

export async function fetchWithCsrf(
  input: RequestInfo | URL,
  init: RequestInit = {},
  options: FetchWithCsrfOptions = {}
) {
  const method = (init.method ?? "GET").toUpperCase();
  const headers = new Headers(init.headers);

  if (!SAFE_METHODS.has(method)) {
    const csrfToken = await ensureCsrfToken();
    headers.set(CSRF_HEADER_NAME, csrfToken);
  }

  const response = await fetch(input, {
    ...init,
    credentials: init.credentials ?? "same-origin",
    headers
  });

  if (response.status === 401 && options.redirectOnUnauthorized !== false) {
    redirectToLogin();
  }

  return response;
}

export async function clientApiRequest<T>(
  input: RequestInfo | URL,
  init: RequestInit = {},
  options: ClientApiRequestOptions
) {
  const method = (init.method ?? "GET").toUpperCase();
  const retries = options.retries ?? (SAFE_METHODS.has(method) ? 1 : 0);
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const url = buildUrlString(input);
  const upstreamSignal = init.signal ?? undefined;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const { clear, signal } = createTimeoutSignal(timeoutMs, upstreamSignal);

    try {
      const response = await fetchWithCsrf(
        input,
        {
          ...init,
          signal
        },
        {
          redirectOnUnauthorized: options.redirectOnUnauthorized
        }
      );
      const { envelope, rawText } = await parseEnvelope<T>(response);

      if (response.ok && !envelope) {
        throw createParseError(url, options.fallbackMessage);
      }

      if (!response.ok || !envelope?.success || envelope.data === undefined) {
        throw new ClientApiError(
          envelope?.message || rawText || options.fallbackMessage || `Request failed with status ${response.status}`,
          {
            category: "http",
            status: envelope?.statusCode ?? response.status,
            traceId: envelope?.traceId,
            url
          }
        );
      }

      return {
        data: envelope.data,
        message: envelope.message ?? "",
        traceId: envelope.traceId ?? ""
      };
    } catch (error) {
      clear();

      if (error instanceof ClientApiError) {
        await reportFrontendError({
          category: error.category,
          message: error.message,
          source: options.source,
          status: error.status,
          traceId: error.traceId,
          url: error.url
        });
        throw error;
      }

      if (error instanceof DOMException && error.name === "AbortError") {
        const timeoutError = new ClientApiError("请求超时，请稍后重试", {
          category: "timeout",
          status: 408,
          url
        });

        if (attempt < retries) {
          await sleep(300 * (attempt + 1));
          continue;
        }

        await reportFrontendError({
          category: timeoutError.category,
          message: timeoutError.message,
          source: options.source,
          status: timeoutError.status,
          url: timeoutError.url
        });
        throw timeoutError;
      }

      const networkError = new ClientApiError(options.fallbackMessage || "网络异常，请稍后重试", {
        category: "network",
        url
      });

      if (attempt < retries) {
        await sleep(300 * (attempt + 1));
        continue;
      }

      await reportFrontendError({
        category: networkError.category,
        message: networkError.message,
        source: options.source,
        status: networkError.status,
        url: networkError.url
      });
      throw networkError;
    } finally {
      clear();
    }
  }

  throw new ClientApiError(options.fallbackMessage || "请求失败", {
    category: "network",
    url
  });
}

export async function clientUploadRequest<T>(
  input: RequestInfo | URL,
  init: RequestInit = {},
  options: ClientApiRequestOptions
) {
  return clientApiRequest<T>(input, init, {
    ...options,
    retries: options.retries ?? 0
  });
}
