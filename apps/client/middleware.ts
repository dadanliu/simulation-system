import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE_NAME = "next_bff_session";
const LOGIN_PATH = "/login";
const PRESENT_PATH_PREFIX = "/present";
const AUTH_API_PATH_PREFIX = "/api/auth";
const API_PATH_PREFIX = "/api";
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function hasSessionCookie(request: NextRequest) {
  return Boolean(request.cookies.get(SESSION_COOKIE_NAME)?.value);
}

function redirectToLogin(request: NextRequest) {
  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = LOGIN_PATH;
  loginUrl.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);

  return NextResponse.redirect(loginUrl);
}

function unauthorizedJson() {
  return NextResponse.json(
    {
      success: false,
      message: "Unauthorized",
      path: "",
      statusCode: 401,
      timestamp: new Date().toISOString()
    },
    {
      status: 401
    }
  );
}

function forbiddenJson(request: NextRequest, message: string) {
  return NextResponse.json(
    {
      success: false,
      message,
      path: `${request.nextUrl.pathname}${request.nextUrl.search}`,
      statusCode: 403,
      timestamp: new Date().toISOString()
    },
    {
      status: 403
    }
  );
}

function getRequestOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");

  if (origin) {
    return origin;
  }

  const referer = request.headers.get("referer");

  if (!referer) {
    return "";
  }

  try {
    return new URL(referer).origin;
  } catch {
    return "";
  }
}

function isCsrfSafeApiRequest(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith(API_PATH_PREFIX)) {
    return true;
  }

  if (SAFE_METHODS.has(request.method.toUpperCase())) {
    return true;
  }

  const requestOrigin = getRequestOrigin(request);

  // Same-origin browser writes send Origin. Non-browser callers may omit it, so this guard rejects explicit mismatches.
  return !requestOrigin || requestOrigin === request.nextUrl.origin;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isLoggedIn = hasSessionCookie(request);

  if (!isCsrfSafeApiRequest(request)) {
    return forbiddenJson(request, "CSRF origin denied");
  }

  // Auth APIs must stay public, otherwise the login request itself would be blocked by this middleware.
  if (pathname.startsWith(AUTH_API_PATH_PREFIX)) {
    return NextResponse.next();
  }

  // Protected pages are browser navigations, so unauthenticated users should be redirected to the login page.
  if (pathname.startsWith(PRESENT_PATH_PREFIX)) {
    return isLoggedIn ? NextResponse.next() : redirectToLogin(request);
  }

  // Protected client APIs should not redirect to HTML; callers need a clear 401 JSON response.
  if (pathname.startsWith(API_PATH_PREFIX)) {
    return isLoggedIn ? NextResponse.next() : unauthorizedJson();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/present/:path*", "/api/:path*"]
};
