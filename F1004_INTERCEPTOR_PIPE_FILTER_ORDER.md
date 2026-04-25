# F1004 Interceptor Pipe Filter Order

这份文档专门解释当前项目里这段成功响应拦截器背后的运行机制：

```ts
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
```

---

## 1. 先区分两个同名概念

这里的 `pipe()` 不是 NestJS 的 `Pipe`。  
这两个东西名字一样，但不是同一个机制。

- NestJS `Pipe`
  负责参数转换、DTO 校验、进入 handler 之前的数据处理
- RxJS `pipe()`
  负责处理 `Observable` 数据流
- 这段 interceptor 里出现的 `pipe(map(...))`
  是 RxJS 的链式流处理，不是 NestJS 参数校验 Pipe

---

## 2. `next.handle()` 到底是什么

在 interceptor 里，`next` 可以理解成：

- 下一个处理环节
- 更准确地说，是“继续放行请求，让后续 handler 执行”的入口

所以：

```ts
next.handle()
```

表示：

- 请求继续往后走
- 最终进入 controller handler
- 然后把 handler 的返回结果包装成 `Observable`

可以把它粗略理解成下面这个意思：

```ts
const result = await controllerMethod();
```

但 NestJS 为了统一同步返回值、Promise、流式返回值，内部统一用 `Observable` 表示。

因此：

- 不调用 `next.handle()`，请求不会继续执行到 handler
- 调用了 `next.handle()`，才会真正进入 controller / service
- `next.handle()` 返回的不是最终值，而是“后续结果流”

---

## 3. 这里的 `.pipe(map(...))` 在做什么

因为 `next.handle()` 返回的是 `Observable`，不能直接当普通值处理。

所以要这样写：

```ts
return next.handle().pipe(
  map((value) => {
    return {
      success: true,
      data: value
    };
  })
);
```

这里的含义是：

1. 先让 controller handler 执行
2. 等它返回结果
3. 再用 `map()` 对返回结果做一次转换
4. 把转换后的结果继续返回给客户端

所以这段 `SuccessResponseInterceptor` 的职责就是：

- 如果 controller 已经返回了标准成功结构，就原样放过
- 如果 controller 只返回 `{ message: "logout success" }`
  就补成 `{ success: true, message: "logout success" }`
- 如果 controller 返回普通对象或数组
  就补成 `{ success: true, data: value }`

---

## 4. 这段 interceptor 的执行时机

interceptor 是“包住 handler”的。

可以理解成：

```text
before logic
  -> controller handler
after logic
```

你当前这个拦截器没有写前置逻辑，但它有后置逻辑。

执行顺序是：

1. 请求进入 interceptor
2. interceptor 调用 `next.handle()`
3. controller / service 执行
4. handler 返回结果
5. `map(...)` 对返回结果做统一包装
6. 把包装后的结果发给客户端

---

## 5. `map()`、`tap()`、`catchError()`、`finalize()` 的区别

在 interceptor 里最常见的几个 RxJS 操作符是：

- `map`
  改返回值
- `tap`
  只观察，不改返回值，适合打印日志、打点
- `catchError`
  捕获异常，可以转换异常或重新抛出
- `finalize`
  无论成功还是失败都会执行，适合收尾统计

示例：

```ts
return next.handle().pipe(
  tap(() => {
    // 打日志，但不改返回值
  }),
  map((data) => ({
    success: true,
    data
  }))
);
```

---

## 6. 多个 interceptor 时会发生什么

如果有多个 interceptor，它们会形成洋葱模型。

假设这样注册：

```ts
app.useGlobalInterceptors(
  new LoggingInterceptor(),
  new SuccessResponseInterceptor()
);
```

那么请求进入时：

1. `LoggingInterceptor` 先执行 before
2. `SuccessResponseInterceptor` 再执行 before
3. controller handler 执行

响应返回时顺序反过来：

4. `SuccessResponseInterceptor` 执行 after
5. `LoggingInterceptor` 执行 after

也就是：

```text
Logging before
  Success before
    Controller
  Success after
Logging after
```

所以：

- interceptor 之间的顺序会影响最终结果
- 外层先进入，内层后进入
- 返回时内层先处理，外层后处理

---

## 7. 注册顺序会影响什么

会影响：

- 多个 interceptor 之间的包裹顺序
- 哪个 interceptor 先看到请求
- 哪个 interceptor 先处理响应

例如在 [main.ts](/Users/liuxing/Desktop/Space/beike-simulation/next-bff/apps/bff/src/main.ts:1) 里：

```ts
app.useGlobalInterceptors(new SuccessResponseInterceptor());
```

现在只有一个拦截器，所以没有顺序歧义。

但如果以后扩展成：

```ts
app.useGlobalInterceptors(
  new LoggingInterceptor(),
  new SuccessResponseInterceptor()
);
```

那就意味着：

- `LoggingInterceptor` 在外层
- `SuccessResponseInterceptor` 在内层

这会影响日志记录看到的是原始 handler 返回值，还是已经被成功包装后的返回值。

---

## 8. `main.ts` 里谁先写，不等于谁先执行

你现在的 [main.ts](/Users/liuxing/Desktop/Space/beike-simulation/next-bff/apps/bff/src/main.ts:1) 是：

```ts
app.useGlobalPipes(
  new ValidationPipe({
    forbidNonWhitelisted: true,
    transform: true,
    whitelist: true
  })
);
app.useGlobalFilters(new HttpExceptionFilter());
app.useGlobalInterceptors(new SuccessResponseInterceptor());
```

这里的先后顺序表示“注册这些全局能力”，不表示一次请求真的按这个书写顺序执行。

NestJS 的请求生命周期大致是：

1. middleware
2. guards
3. interceptors before
4. pipes
5. controller handler
6. service
7. interceptors after
8. exception filters

所以：

- 不是因为你先 `useGlobalFilters()`，filter 就会先于 interceptor 执行
- filter 只有在异常真正抛出时才会接管
- interceptor 则包裹 handler 的前后过程

---

## 9. Interceptor 和 Filter 的职责差异

### 9.1 Interceptor

interceptor 更适合做：

- 成功响应统一包装
- 返回值改写
- 请求耗时统计
- 日志记录
- 缓存
- 流式响应处理

你当前项目里的：

- [`SuccessResponseInterceptor`](/Users/liuxing/Desktop/Space/beike-simulation/next-bff/apps/bff/src/common/interceptors/success-response.interceptor.ts)

主要负责：

- 成功响应统一结构

### 9.2 Filter

filter 更适合做：

- 请求链路里出现异常后的最终兜底
- 把异常转换成统一 HTTP 错误响应

你当前项目里的：

- [`HttpExceptionFilter`](/Users/liuxing/Desktop/Space/beike-simulation/next-bff/apps/bff/src/common/filters/http-exception.filter.ts)

主要负责：

- 把 `UnauthorizedException`、校验异常、系统异常等统一转成错误 JSON

所以可以这样记：

- interceptor 处理“成功路径前后”
- filter 处理“异常路径出口”

---

## 10. 如果 interceptor 里也处理异常呢

interceptor 也可以通过 `catchError()` 看到异常：

```ts
return next.handle().pipe(
  map((data) => ({
    success: true,
    data
  })),
  catchError((error) => {
    throw error;
  })
);
```

这时：

- interceptor 先有机会捕获异常
- 如果它重新抛出，最后还是会到 filter
- 如果它把异常吞掉并转成正常值，filter 就不会再执行

所以：

- filter 是最终兜底
- interceptor 可以提前观察或转换异常
- 但两者不要混成一个职责不清的大杂烩

---

## 11. 用当前项目举例

以 `POST /api/auth/logout` 为例：

1. 请求进入 controller
2. `AuthController.logout()` 调用 `AuthService.logout()` 删除 session
3. controller 设置清 cookie 的 `Set-Cookie`
4. handler 返回：

```ts
return {
  message: "logout success"
};
```

5. `SuccessResponseInterceptor` 收到这个返回值
6. 通过 `map(...)` 把它包装成：

```json
{
  "success": true,
  "message": "logout success"
}
```

7. 如果中途抛异常，则不走成功包装，异常会进入 `HttpExceptionFilter`

---

## 12. 一句话总结

- `next.handle()`：放行到下一个环节，并拿到后续返回结果的 `Observable`
- `.pipe(map(...))`：在结果返回客户端前做流式转换
- 多个 interceptor：外层先入，内层后入，返回时反过来
- interceptor 和 filter：前者包成功路径，后者兜异常出口
