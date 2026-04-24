import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "../config.js";

export function parseCookies(cookieHeader = "") {
  return cookieHeader
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean)
    .reduce((result, item) => {
      const [key, ...rest] = item.split("=");
      result[key] = decodeURIComponent(rest.join("="));
      return result;
    }, {});
}

export function getSessionIdFromRequest(request) {
  const cookies = parseCookies(request.headers.cookie);
  return cookies[SESSION_COOKIE_NAME] ?? null;
}

export function createSessionCookie(sessionId) {
  return [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(sessionId)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${SESSION_MAX_AGE_SECONDS}`
  ].join("; ");
}

export function clearSessionCookie() {
  return [
    `${SESSION_COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0"
  ].join("; ");
}
