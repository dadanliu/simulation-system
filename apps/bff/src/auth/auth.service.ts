import { Injectable, UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";
import { UserService } from "../user/user.service";
import { getSessionIdFromRequest } from "./session-cookie";
import { SessionStoreService, type SessionDevice } from "./session-store.service";

@Injectable()
export class AuthService {
  constructor(
    private readonly sessionStoreService: SessionStoreService,
    private readonly userService: UserService
  ) {}

  async login(username: string, password: string, device: SessionDevice = {}) {
    const user = await this.userService.findUserByCredentials(username, password);

    if (!user) {
      throw new UnauthorizedException("invalid username or password");
    }

    const sessionId = await this.sessionStoreService.createSession(user.id, device);

    return {
      user,
      sessionId
    };
  }

  async logout(request: Request) {
    const sessionId = getSessionIdFromRequest(request);
    await this.sessionStoreService.deleteSession(sessionId);
  }

  listUserSessions(userId: string) {
    return this.sessionStoreService.listUserSessions(userId);
  }

  getSessionTtlSeconds() {
    return this.sessionStoreService.getSessionTtlSeconds();
  }
}
