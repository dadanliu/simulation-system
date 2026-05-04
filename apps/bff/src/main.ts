import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { createCsrfOriginMiddleware } from "./common/http/csrf-origin";
import { traceIdMiddleware } from "./common/http/trace-id";
import { RequestLoggingInterceptor } from "./common/interceptors/request-logging.interceptor";
import { SuccessResponseInterceptor } from "./common/interceptors/success-response.interceptor";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const swaggerConfig = new DocumentBuilder()
    .setTitle("Next BFF API")
    .setDescription("Core BFF APIs for auth, commodity, upload and audit logs")
    .setVersion("1.0")
    .addCookieAuth("next_bff_session")
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);

  SwaggerModule.setup("api/docs", app, swaggerDocument);
  app.use(traceIdMiddleware);
  app.use(
    createCsrfOriginMiddleware(
      configService
        .getOrThrow<string>("CSRF_ALLOWED_ORIGINS")
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean)
    )
  );
  // 全局启用 DTO 校验。Controller 里只要使用 class DTO，NestJS 就会在进入 handler 前校验请求参数。
  app.useGlobalPipes(
    new ValidationPipe({
      // 请求里出现 DTO 没声明的字段时，直接返回 400，避免客户端偷偷传入多余字段。
      forbidNonWhitelisted: true,
      // 把请求参数转换成 DTO 声明的类型实例，这样 class-validator 装饰器才能稳定生效。
      transform: true,
      // 只保留 DTO 中声明过校验装饰器的字段，未声明字段会被过滤或配合 forbidNonWhitelisted 报错。
      whitelist: true
    })
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(app.get(RequestLoggingInterceptor), app.get(SuccessResponseInterceptor));
  await app.listen(Number(configService.getOrThrow<string>("BFF_PORT")));
}

bootstrap();
