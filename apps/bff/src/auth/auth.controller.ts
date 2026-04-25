import { Body, Controller, Get, Post, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { clearSessionCookie, createSessionCookie } from "./session-cookie";
import { RequireLoginService } from "./require-login";

@Controller("api/auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly requireLoginService: RequireLoginService
  ) {}

  @Post("login")
  login(@Body() body: LoginDto, @Res({ passthrough: true }) response: Response) {
    const result = this.authService.login(body.username.trim(), body.password);

    response.setHeader("Set-Cookie", createSessionCookie(result.sessionId));

    return {
      success: true,
      data: {
        user: result.user
      }
    };
  }

  @Post("logout")
  logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    this.authService.logout(request);
    response.setHeader("Set-Cookie", clearSessionCookie());

    return {
      success: true,
      message: "logout success"
    };
  }

  @Get("me")
  me(@Req() request: Request) {
    const user = this.requireLoginService.execute(request);

    return {
      success: true,
      data: {
        user
      }
    };
  }
}
