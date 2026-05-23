import { SetMetadata, type ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

export const PUBLIC_ROUTE_KEY = "isPublic";

export const Public = () => SetMetadata(PUBLIC_ROUTE_KEY, true);

export function isPublicRoute(reflector: Reflector, context: ExecutionContext) {
  return (
    reflector.getAllAndOverride<boolean>(PUBLIC_ROUTE_KEY, [
      context.getHandler(),
      context.getClass()
    ]) === true
  );
}
