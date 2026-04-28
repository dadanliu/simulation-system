import { Injectable, UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";
import { UserService } from "../user/user.service";
import { getSessionIdFromRequest } from "./session-cookie";
import { SessionStoreService } from "./session-store.service";

@Injectable()
export class AuthService {
  constructor(
    private readonly sessionStoreService: SessionStoreService,
    private readonly userService: UserService
  ) {}

  async login(username: string, password: string) {
    const user = await this.userService.findUserByCredentials(username, password);

    if (!user) {
      throw new UnauthorizedException("invalid username or password");
    }

    const sessionId = this.sessionStoreService.createSession(user.id);

    return {
      user,
      sessionId
    };
  }

  logout(request: Request) {
    const sessionId = getSessionIdFromRequest(request);
    this.sessionStoreService.deleteSession(sessionId);
  }
}
