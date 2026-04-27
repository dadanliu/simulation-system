import { Body, Controller, Get, Post, Req, Res, UseGuards } from "@nestjs/common";
import type { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { AuthGuard } from "./auth.guard";
import { CurrentUser } from "./current-user.decorator";
import { LoginDto } from "./dto/login.dto";
import type { AuthUser } from "../user/user.types";
import { clearSessionCookie, createSessionCookie } from "./session-cookie";

@Controller("api/auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
      message: "logout success"
    };
  }

  @Get("me")
  @UseGuards(AuthGuard)
  me(@CurrentUser() user: AuthUser) {
    return {
      success: true,
      data: {
        user
      }
    };
  }
}
