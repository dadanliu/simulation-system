import { getSessionIdFromRequest } from "./session-cookie.js";
import { getSession } from "../session-store.js";

export function getCurrentUser(request) {
  const sessionId = getSessionIdFromRequest(request);
  const session = getSession(sessionId);

  return session?.user ?? null;
}
