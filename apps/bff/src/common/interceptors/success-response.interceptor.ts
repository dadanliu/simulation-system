import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { map, type Observable } from "rxjs";

type SuccessEnvelope =
  | {
      success: true;
      data: unknown;
    }
  | {
      success: true;
      message: string;
    };

function isSuccessEnvelope(value: unknown): value is SuccessEnvelope {
  return typeof value === "object" && value !== null && "success" in value && value.success === true;
}

@Injectable()
export class SuccessResponseInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<SuccessEnvelope> {
    return next.handle().pipe(
      map((value) => {
        if (isSuccessEnvelope(value)) {
          return value;
        }

        if (typeof value === "object" && value !== null && "message" in value && typeof value.message === "string") {
          return {
            success: true,
            message: value.message
          };
        }

        return {
          success: true,
          data: value
        };
      })
    );
  }
}
