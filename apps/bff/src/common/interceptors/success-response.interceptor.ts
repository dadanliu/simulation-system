import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { map, type Observable } from "rxjs";
import {
  SKIP_RESPONSE_ENVELOPE_KEY,
  SUCCESS_RESPONSE_MESSAGE_KEY
} from "./response-envelope.decorator";

type SuccessEnvelope = {
  success: true;
  data: unknown;
  message: string;
  traceId: string;
};

@Injectable()
export class SuccessResponseInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler
  ): Observable<SuccessEnvelope | unknown> {
    const shouldSkip = this.reflector.getAllAndOverride<boolean>(
      SKIP_RESPONSE_ENVELOPE_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (shouldSkip) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<{ traceId?: string }>();
    const message =
      this.reflector.getAllAndOverride<string>(SUCCESS_RESPONSE_MESSAGE_KEY, [
        context.getHandler(),
        context.getClass()
      ]) ?? "ok";

    return next.handle().pipe(
      map((value) => {
        return {
          success: true,
          data: value ?? null,
          message,
          traceId: request.traceId ?? ""
        };
      })
    );
  }
}
