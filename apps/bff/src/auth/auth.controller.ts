import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  Req,
  Res
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  ApiBody,
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags
} from "@nestjs/swagger";
import type { Request, Response } from "express";
import { createCsrfCookie, generateCsrfToken } from "../common/http/csrf-token";
import { ErrorResponseDto } from "../common/swagger/error-response.dto";
import { AuthService } from "./auth.service";
import { CurrentUser } from "./current-user.decorator";
import { LoginDto } from "./dto/login.dto";
import type { AuthUser } from "../user/user.types";
import { SuccessResponseMessage } from "../common/interceptors/response-envelope.decorator";
import { clearSessionCookie, createSessionCookie } from "./session-cookie";
import { QueryLoginAuditLogDto } from "./dto/query-login-audit-log.dto";
import { QueryLoginRiskDailyStatDto } from "./dto/query-login-risk-daily-stat.dto";
import { RequirePermissions } from "../permission/permissions.decorator";
import { Public } from "./public.decorator";

@ApiTags("Auth")
@Controller("api/auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService
  ) {}

  @Post("login")
  @Public()
  @ApiOperation({ summary: "用户登录" })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: "登录成功，返回统一成功响应并设置 session cookie"
  })
  @ApiResponse({
    status: 400,
    description: "请求参数错误",
    type: ErrorResponseDto
  })
  @ApiResponse({
    status: 401,
    description: "用户名或密码错误",
    type: ErrorResponseDto
  })
  @ApiResponse({
    status: 429,
    description: "登录尝试过于频繁",
    type: ErrorResponseDto
  })
  async login(
    @Body() body: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response
  ) {
    const result = await this.authService.login(
      body.username.trim(),
      body.password,
      {
        ip: request.ip,
        traceId: (request as Request & { traceId?: string }).traceId,
        userAgent: request.headers["user-agent"]?.toString()
      }
    );
    const csrfToken = generateCsrfToken();

    response.setHeader("Set-Cookie", [
      createSessionCookie(result.sessionId, {
        maxAgeSeconds: this.authService.getSessionTtlSeconds(),
        secure: this.shouldUseSecureCookie()
      }),
      createCsrfCookie(csrfToken, { secure: this.shouldUseSecureCookie() })
    ]);

    return {
      user: result.user
    };
  }

  @Post("logout")
  @Public()
  @HttpCode(200)
  @SuccessResponseMessage("logout success")
  @ApiOperation({ summary: "退出登录" })
  @ApiCookieAuth("next_bff_session")
  @ApiResponse({ status: 200, description: "退出成功" })
  @ApiResponse({ status: 401, description: "未登录", type: ErrorResponseDto })
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response
  ) {
    await this.authService.logout(request);
    response.setHeader("Set-Cookie", [
      clearSessionCookie({ secure: this.shouldUseSecureCookie() }),
      createCsrfCookie(generateCsrfToken(), {
        secure: this.shouldUseSecureCookie()
      })
    ]);

    return null;
  }

  @Get("csrf")
  @Public()
  @ApiOperation({ summary: "获取 CSRF token" })
  @ApiResponse({ status: 200, description: "获取 CSRF token 成功" })
  csrf(@Res({ passthrough: true }) response: Response) {
    const csrfToken = generateCsrfToken();

    response.setHeader(
      "Set-Cookie",
      createCsrfCookie(csrfToken, { secure: this.shouldUseSecureCookie() })
    );

    return {
      csrfToken
    };
  }

  @Get("me")
  @ApiOperation({ summary: "获取当前登录用户" })
  @ApiCookieAuth("next_bff_session")
  @ApiResponse({ status: 200, description: "获取当前用户成功" })
  @ApiResponse({ status: 401, description: "未登录", type: ErrorResponseDto })
  me(@CurrentUser() user: AuthUser) {
    return {
      user
    };
  }

  @Get("sessions")
  @ApiOperation({ summary: "获取当前用户会话列表" })
  @ApiCookieAuth("next_bff_session")
  @ApiResponse({ status: 200, description: "获取当前用户会话成功" })
  @ApiResponse({ status: 401, description: "未登录", type: ErrorResponseDto })
  sessions(@CurrentUser() user: AuthUser) {
    return this.authService.listUserSessions(user.id);
  }

  @Get("login-logs")
  @RequirePermissions("audit:read")
  @ApiOperation({ summary: "查询登录日志" })
  @ApiCookieAuth("next_bff_session")
  @ApiResponse({ status: 200, description: "查询登录日志成功" })
  @ApiResponse({ status: 401, description: "未登录", type: ErrorResponseDto })
  @ApiResponse({
    status: 403,
    description: "无审计日志查看权限",
    type: ErrorResponseDto
  })
  @ApiResponse({
    status: 429,
    description: "审计查询过于频繁",
    type: ErrorResponseDto
  })
  loginLogs(@Query() query: QueryLoginAuditLogDto) {
    return this.authService.listLoginLogs(query);
  }

  @Get("login-risk-daily-stats")
  @RequirePermissions("audit:read")
  @ApiOperation({ summary: "查询每日登录风控统计" })
  @ApiCookieAuth("next_bff_session")
  @ApiResponse({ status: 200, description: "查询每日登录风控统计成功" })
  @ApiResponse({ status: 401, description: "未登录", type: ErrorResponseDto })
  @ApiResponse({
    status: 403,
    description: "无登录风控统计查看权限",
    type: ErrorResponseDto
  })
  @ApiResponse({
    status: 429,
    description: "审计查询过于频繁",
    type: ErrorResponseDto
  })
  loginRiskDailyStats(@Query() query: QueryLoginRiskDailyStatDto) {
    return this.authService.listLoginRiskDailyStats(query);
  }

  private shouldUseSecureCookie() {
    const explicitValue = this.configService.get<string>("COOKIE_SECURE");

    if (explicitValue === "true") {
      return true;
    }

    if (explicitValue === "false") {
      return false;
    }

    return this.configService.get<string>("NODE_ENV") === "production";
  }
}
