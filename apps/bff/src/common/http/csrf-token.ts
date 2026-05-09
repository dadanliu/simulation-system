import { randomBytes } from "node:crypto";
import type { Request } from "express";

export const CSRF_COOKIE_NAME = "next_bff_csrf";
export const CSRF_HEADER_NAME = "x-csrf-token";

type CsrfCookieOptions = {
  secure?: boolean;
};

export function generateCsrfToken() {
  return randomBytes(32).toString("hex");
}

export function parseCookies(cookieHeader = "") {
  return cookieHeader
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((result, item) => {
      const [key, ...rest] = item.split("=");
      result[key] = decodeURIComponent(rest.join("="));
      return result;
    }, {});
}

export function getCsrfTokenFromRequest(request: Request) {
  const cookieToken =
    parseCookies(request.headers.cookie)[CSRF_COOKIE_NAME] ?? "";
  const headerValue = request.headers[CSRF_HEADER_NAME];
  const headerToken = Array.isArray(headerValue)
    ? (headerValue[0] ?? "")
    : (headerValue ?? "");

  return {
    cookieToken,
    headerToken
  };
}

export function createCsrfCookie(
  token: string,
  options: CsrfCookieOptions = {}
) {
  const cookieParts = [
    `${CSRF_COOKIE_NAME}=${encodeURIComponent(token)}`,
    "Path=/",
    "SameSite=Lax"
  ];

  if (options.secure) {
    cookieParts.push("Secure");
  }

  return cookieParts.join("; ");
}
