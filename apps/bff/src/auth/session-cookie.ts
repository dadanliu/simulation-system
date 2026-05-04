import type { Request } from "express";

export const SESSION_COOKIE_NAME = "next_bff_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24;

type SessionCookieOptions = {
  maxAgeSeconds?: number;
  secure?: boolean;
};

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

export function getSessionIdFromRequest(request: Request) {
  const cookies = parseCookies(request.headers.cookie);
  return cookies[SESSION_COOKIE_NAME] ?? null;
}

export function createSessionCookie(sessionId: string, options: SessionCookieOptions = {}) {
  const maxAgeSeconds = options.maxAgeSeconds ?? SESSION_MAX_AGE_SECONDS;
  const cookieParts = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(sessionId)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAgeSeconds}`
  ];

  if (options.secure) {
    cookieParts.push("Secure");
  }

  return cookieParts.join("; ");
}

export function clearSessionCookie(options: SessionCookieOptions = {}) {
  const cookieParts = [`${SESSION_COOKIE_NAME}=`, "Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=0"];

  if (options.secure) {
    cookieParts.push("Secure");
  }

  return cookieParts.join("; ");
}
