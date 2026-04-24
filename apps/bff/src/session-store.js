import crypto from "node:crypto";
import { SESSION_MAX_AGE_SECONDS } from "./config.js";

const sessionStore = new Map();

export function createSession(user) {
  const sessionId = crypto.randomUUID();
  const expiresAt = Date.now() + SESSION_MAX_AGE_SECONDS * 1000;

  sessionStore.set(sessionId, {
    user,
    expiresAt
  });

  return {
    sessionId,
    expiresAt
  };
}

export function getSession(sessionId) {
  if (!sessionId) {
    return null;
  }

  const session = sessionStore.get(sessionId);

  if (!session) {
    return null;
  }

  if (session.expiresAt <= Date.now()) {
    sessionStore.delete(sessionId);
    return null;
  }

  return session;
}

export function deleteSession(sessionId) {
  if (!sessionId) {
    return;
  }

  sessionStore.delete(sessionId);
}
