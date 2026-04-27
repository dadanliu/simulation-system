import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { traceIdMiddleware } from "./common/http/trace-id";
import { SuccessResponseInterceptor } from "./common/interceptors/success-response.interceptor";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(traceIdMiddleware);
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
  app.useGlobalInterceptors(new SuccessResponseInterceptor());
  await app.listen(process.env.PORT ?? 3001);
}

bootstrap();
