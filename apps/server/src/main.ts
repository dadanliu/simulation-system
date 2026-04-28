import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { traceIdMiddleware } from "./common/http/trace-id";
import { RequestLoggingInterceptor } from "./common/interceptors/request-logging.interceptor";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(traceIdMiddleware);
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(app.get(RequestLoggingInterceptor));
  await app.listen(process.env.PORT ?? 3002);
}

bootstrap();
