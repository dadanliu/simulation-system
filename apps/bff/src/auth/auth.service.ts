import { Injectable, UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";
import { findUserByCredentials } from "./mock-users";
import { getSessionIdFromRequest } from "./session-cookie";
import { SessionStoreService } from "./session-store.service";
import { GetCurrentUserService } from "./get-current-user";

@Injectable()
export class AuthService {
  constructor(
    private readonly sessionStoreService: SessionStoreService,
    private readonly getCurrentUserService: GetCurrentUserService
  ) {}

  login(username: string, password: string) {
    const user = findUserByCredentials(username, password);

    if (!user) {
      throw new UnauthorizedException("invalid username or password");
    }

    const sessionId = this.sessionStoreService.createSession(user);

    return {
      user,
      sessionId
    };
  }

  logout(request: Request) {
    const sessionId = getSessionIdFromRequest(request);
    this.sessionStoreService.deleteSession(sessionId);
  }

  getCurrentUser(request: Request) {
    return this.getCurrentUserService.execute(request);
  }
}
