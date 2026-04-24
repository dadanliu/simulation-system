import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE_NAME = "next_bff_session";
const LOGIN_PATH = "/login";
const PRESENT_PATH_PREFIX = "/present";
const AUTH_API_PATH_PREFIX = "/api/auth";
const API_PATH_PREFIX = "/api";

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
      message: "Unauthorized"
    },
    {
      status: 401
    }
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isLoggedIn = hasSessionCookie(request);

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
