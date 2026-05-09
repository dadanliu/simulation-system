import {
  BadGatewayException,
  HttpException,
  InternalServerErrorException
} from "@nestjs/common";

export type BackendEnvelope<T> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      message?: string;
      error?: string;
      code?: string | number;
    }
  | {
      errno: 0;
      data: T;
      errmsg?: string;
    }
  | {
      errno: number;
      data?: unknown;
      errmsg?: string;
    };

export class BffBusinessException extends HttpException {
  constructor(
    message: string,
    readonly code?: string | number
  ) {
    super(
      {
        success: false,
        code,
        message
      },
      400
    );
  }
}

export class BffSystemException extends InternalServerErrorException {
  constructor(message = "BFF system error") {
    super({
      success: false,
      message
    });
  }
}

export class BackendRequestException extends BadGatewayException {
  constructor(message = "Backend request failed") {
    super({
      success: false,
      message
    });
  }
}
