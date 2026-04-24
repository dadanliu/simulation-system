import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { AuthUser } from "./mock-users";
import { SESSION_MAX_AGE_SECONDS } from "./session-cookie";

type SessionRecord = {
  user: AuthUser;
  expiresAt: number;
};

@Injectable()
export class SessionStoreService {
  private readonly store = new Map<string, SessionRecord>();

  createSession(user: AuthUser) {
    const sessionId = randomUUID();

    this.store.set(sessionId, {
      user,
      expiresAt: Date.now() + SESSION_MAX_AGE_SECONDS * 1000
    });

    return sessionId;
  }

  getSession(sessionId: string | null) {
    if (!sessionId) {
      return null;
    }

    const session = this.store.get(sessionId);

    if (!session) {
      return null;
    }

    if (session.expiresAt <= Date.now()) {
      this.store.delete(sessionId);
      return null;
    }

    return session;
  }

  deleteSession(sessionId: string | null) {
    if (!sessionId) {
      return;
    }

    this.store.delete(sessionId);
  }
}
