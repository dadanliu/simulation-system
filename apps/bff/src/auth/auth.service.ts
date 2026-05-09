import { Injectable, UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";
import { UserService } from "../user/user.service";
import { getSessionIdFromRequest } from "./session-cookie";
import { LoginAuditLogService } from "./login-audit-log.service";
import { LoginRiskService } from "./login-risk.service";
import {
  SessionStoreService,
  type SessionDevice
} from "./session-store.service";
import { QueryLoginAuditLogDto } from "./dto/query-login-audit-log.dto";

type LoginContext = SessionDevice & {
  traceId?: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly loginAuditLogService: LoginAuditLogService,
    private readonly loginRiskService: LoginRiskService,
    private readonly sessionStoreService: SessionStoreService,
    private readonly userService: UserService
  ) {}

  async login(username: string, password: string, context: LoginContext = {}) {
    const normalizedUsername = username.trim().toLowerCase();

    try {
      await this.loginRiskService.assertLoginAllowed({
        ip: context.ip ?? "",
        username: normalizedUsername
      });
    } catch (error) {
      await this.loginAuditLogService.recordBlocked(
        normalizedUsername,
        context
      );
      throw error;
    }

    const user = await this.userService.findUserByCredentials(
      normalizedUsername,
      password
    );

    if (!user) {
      try {
        await this.loginRiskService.recordFailure({
          ip: context.ip ?? "",
          username: normalizedUsername
        });
      } catch (error) {
        if (this.loginRiskService.isRateLimitError(error)) {
          await this.loginAuditLogService.recordBlocked(
            normalizedUsername,
            context
          );
          throw error;
        }

        await this.loginAuditLogService.recordFailure(
          normalizedUsername,
          context
        );
        throw error;
      }

      throw new UnauthorizedException("invalid username or password");
    }

    await this.loginRiskService.reset({
      ip: context.ip ?? "",
      username: normalizedUsername
    });
    await this.loginAuditLogService.recordSuccess(
      normalizedUsername,
      user.id,
      context
    );
    const sessionId = await this.sessionStoreService.createSession(
      user.id,
      context
    );

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

  listLoginLogs(query: QueryLoginAuditLogDto) {
    return this.loginAuditLogService.listLogs(query);
  }

  getSessionTtlSeconds() {
    return this.sessionStoreService.getSessionTtlSeconds();
  }
}
