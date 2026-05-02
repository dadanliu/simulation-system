import { Body, Controller, Get, Post, Req, Res, UseGuards } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  ApiBody,
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags
} from "@nestjs/swagger";
import type { Request, Response } from "express";
import { ErrorResponseDto } from "../common/swagger/error-response.dto";
import { AuthService } from "./auth.service";
import { AuthGuard } from "./auth.guard";
import { CurrentUser } from "./current-user.decorator";
import { LoginDto } from "./dto/login.dto";
import type { AuthUser } from "../user/user.types";
import { SuccessResponseMessage } from "../common/interceptors/response-envelope.decorator";
import { clearSessionCookie, createSessionCookie } from "./session-cookie";

@ApiTags("Auth")
@Controller("api/auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService
  ) {}

  @Post("login")
  @ApiOperation({ summary: "用户登录" })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: "登录成功，返回统一成功响应并设置 session cookie" })
  @ApiResponse({ status: 400, description: "请求参数错误", type: ErrorResponseDto })
  @ApiResponse({ status: 401, description: "用户名或密码错误", type: ErrorResponseDto })
  async login(@Body() body: LoginDto, @Res({ passthrough: true }) response: Response) {
    const result = await this.authService.login(body.username.trim(), body.password);

    response.setHeader("Set-Cookie", createSessionCookie(result.sessionId, { secure: this.shouldUseSecureCookie() }));

    return {
      user: result.user
    };
  }

  @Post("logout")
  @SuccessResponseMessage("logout success")
  @ApiOperation({ summary: "退出登录" })
  @ApiCookieAuth("next_bff_session")
  @ApiResponse({ status: 200, description: "退出成功" })
  @ApiResponse({ status: 401, description: "未登录", type: ErrorResponseDto })
  logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    this.authService.logout(request);
    response.setHeader("Set-Cookie", clearSessionCookie({ secure: this.shouldUseSecureCookie() }));

    return null;
  }

  @Get("me")
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: "获取当前登录用户" })
  @ApiCookieAuth("next_bff_session")
  @ApiResponse({ status: 200, description: "获取当前用户成功" })
  @ApiResponse({ status: 401, description: "未登录", type: ErrorResponseDto })
  me(@CurrentUser() user: AuthUser) {
    return {
      user
    };
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
