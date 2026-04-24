import { clearSessionCookie, createSessionCookie, getSessionIdFromRequest } from "../auth/session-cookie.js";
import { getCurrentUser } from "../auth/get-current-user.js";
import { requireLogin } from "../auth/require-login.js";
import { sendJson, sendMethodNotAllowed, sendNotFound, readJsonBody } from "../http.js";
import { findUserByCredentials, sanitizeUser } from "../mock-users.js";
import { createSession, deleteSession } from "../session-store.js";

async function handleLogin(request, response) {
  if (request.method !== "POST") {
    sendMethodNotAllowed(response, request.method);
    return;
  }

  const body = await readJsonBody(request);
  const username = typeof body.username === "string" ? body.username.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!username || !password) {
    sendJson(response, 400, {
      success: false,
      message: "username and password are required"
    });
    return;
  }

  const user = findUserByCredentials(username, password);

  if (!user) {
    sendJson(response, 401, {
      success: false,
      message: "invalid username or password"
    });
    return;
  }

  const safeUser = sanitizeUser(user);
  const session = createSession(safeUser);

  sendJson(
    response,
    200,
    {
      success: true,
      data: {
        user: safeUser
      }
    },
    {
      "Set-Cookie": createSessionCookie(session.sessionId)
    }
  );
}

function handleLogout(request, response) {
  if (request.method !== "POST") {
    sendMethodNotAllowed(response, request.method);
    return;
  }

  const sessionId = getSessionIdFromRequest(request);
  deleteSession(sessionId);

  sendJson(
    response,
    200,
    {
      success: true,
      message: "logout success"
    },
    {
      "Set-Cookie": clearSessionCookie()
    }
  );
}

function handleMe(request, response) {
  if (request.method !== "GET") {
    sendMethodNotAllowed(response, request.method);
    return;
  }

  const user = requireLogin(request, response);

  if (!user) {
    return;
  }

  sendJson(response, 200, {
    success: true,
    data: {
      user
    }
  });
}

export async function handleAuthRoutes(request, response) {
  const url = new URL(request.url, "http://127.0.0.1");

  if (url.pathname === "/api/auth/login") {
    await handleLogin(request, response);
    return true;
  }

  if (url.pathname === "/api/auth/logout") {
    handleLogout(request, response);
    return true;
  }

  if (url.pathname === "/api/auth/me") {
    handleMe(request, response);
    return true;
  }

  return false;
}

export function handleAuthNotFound(response) {
  sendNotFound(response);
}

export { getCurrentUser, requireLogin };
