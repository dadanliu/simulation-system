"use client";

const CSRF_COOKIE_NAME = "next_bff_csrf";
const CSRF_HEADER_NAME = "x-csrf-token";
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

type CsrfResponse = {
  data?: {
    csrfToken?: string;
  };
  message?: string;
  success: boolean;
};

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

export async function fetchWithCsrf(input: RequestInfo | URL, init: RequestInit = {}) {
  const method = (init.method ?? "GET").toUpperCase();
  const headers = new Headers(init.headers);

  if (!SAFE_METHODS.has(method)) {
    const csrfToken = await ensureCsrfToken();
    headers.set(CSRF_HEADER_NAME, csrfToken);
  }

  return fetch(input, {
    ...init,
    credentials: init.credentials ?? "same-origin",
    headers
  });
}
