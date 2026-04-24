import {
  Body,
  Controller,
  Get,
  Post,
  BadRequestException,
  UnauthorizedException,
  Req,
  Res
} from "@nestjs/common";
import type { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { clearSessionCookie, createSessionCookie } from "./session-cookie";
import { RequireLoginService } from "./require-login";

type LoginBody = {
  username?: string;
  password?: string;
};

@Controller("api/auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly requireLoginService: RequireLoginService
  ) {}

  @Post("login")
  login(@Body() body: LoginBody, @Res() response: Response) {
    const username = typeof body.username === "string" ? body.username.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!username || !password) {
      throw new BadRequestException("username and password are required");
    }

    const result = this.authService.login(username, password);

    if (!result) {
      throw new UnauthorizedException("invalid username or password");
    }

    response.setHeader("Set-Cookie", createSessionCookie(result.sessionId));

    return response.status(200).json({
      success: true,
      data: {
        user: result.user
      }
    });
  }

  @Post("logout")
  logout(@Req() request: Request, @Res() response: Response) {
    this.authService.logout(request);
    response.setHeader("Set-Cookie", clearSessionCookie());

    return response.status(200).json({
      success: true,
      message: "logout success"
    });
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
