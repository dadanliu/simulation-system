import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { traceIdMiddleware } from "./common/http/trace-id";
import { RequestLoggingInterceptor } from "./common/interceptors/request-logging.interceptor";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  app.use(traceIdMiddleware);
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(app.get(RequestLoggingInterceptor));
  await app.listen(Number(configService.getOrThrow<string>("SERVER_PORT")));
}

bootstrap();
