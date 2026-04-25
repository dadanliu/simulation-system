# F1001 BFF Login NestJS Capabilities

这份文档只讲本次登录链路迭代里实际用到的 NestJS 能力，以及这些能力在当前系统里各自解决了什么问题。

本次迭代覆盖的登录链路：

```text
Login Page
  ↓ POST /api/auth/login
AuthController
  ↓
ValidationPipe + LoginDto
  ↓
AuthService
  ↓
SessionStoreService
  ↓
Set-Cookie
  ↓
HTTP Response / ExceptionFilter
```

---

## 1. `@Module`

本次使用位置：

- [`AuthModule`](/Users/liuxing/Desktop/Space/beike-simulation/next-bff/apps/bff/src/auth/auth.module.ts)

这次解决的问题：

- 把登录、退出、当前用户、session 管理组织在一个明确模块里
- 让 `AuthController`、`AuthService`、`SessionStoreService`、`RequireLoginService` 的依赖关系清楚
- 让后续登录态能力可以被其他模块复用，而不是散落在 `main.ts` 或单个 controller

这次你应该理解到的设计点：

- NestJS 不是直接靠文件夹分组，而是靠 module 明确能力边界
- `AuthModule` 是“登录相关能力的容器”，不是单纯的目录

---

## 2. `@Controller` + `@Post` + `@Body`

本次使用位置：

- [`AuthController.login()`](/Users/liuxing/Desktop/Space/beike-simulation/next-bff/apps/bff/src/auth/auth.controller.ts)

这次解决的问题：

- 为前端提供明确的 BFF 登录入口 `/api/auth/login`
- 把 HTTP 请求接收、响应返回、cookie 写入这类传输层事情集中在 Controller
- 让登录业务判断不再混在前端页面或别的模块里

这次你应该理解到的设计点：

- Controller 负责“接 HTTP 请求”和“返回 HTTP 响应”
- Controller 不是认证逻辑本身
- `@Body()` 让输入契约可以直接落到 DTO 上

---

## 3. DTO

本次使用位置：

- [`LoginDto`](/Users/liuxing/Desktop/Space/beike-simulation/next-bff/apps/bff/src/auth/dto/login.dto.ts)

这次解决的问题：

- 把登录接口需要的输入收敛成明确结构：`username`、`password`
- 让后续参数校验有稳定载体，而不是在 Controller 里手写一堆 if
- 为 Swagger、测试、错误处理提供统一的输入边界

这次你应该理解到的设计点：

- DTO 是“接口输入契约”
- DTO 不等于数据库模型，也不等于 session 结构
- DTO 的价值不是多一个文件，而是把输入规则变成明确对象

---

## 4. `ValidationPipe`

本次使用位置：

- [`main.ts`](/Users/liuxing/Desktop/Space/beike-simulation/next-bff/apps/bff/src/main.ts)

这次解决的问题：

- 让登录参数在进入 `AuthService` 之前先被校验
- 避免 Controller 反复写基础参数判断
- 让非法输入统一走 NestJS 的异常链路，而不是每个接口自己拼错误响应

当前启用方式：

```ts
app.useGlobalPipes(
  new ValidationPipe({
    forbidNonWhitelisted: true,
    transform: true,
    whitelist: true
  })
);
```

这次你应该理解到的设计点：

- `ValidationPipe` 解决的是“参数何时、在哪层被拦住”
- 它应该尽量放在业务逻辑之前
- 全局启用后，后续商品、上传、权限查询都可以复用同一套机制

---

## 5. `class-validator`

本次使用位置：

- [`LoginDto`](/Users/liuxing/Desktop/Space/beike-simulation/next-bff/apps/bff/src/auth/dto/login.dto.ts)

这次解决的问题：

- 用声明式方式约束 `username`、`password` 必须是字符串且不能为空
- 让校验规则跟 DTO 放在一起，而不是散落在 Controller

本次实际使用：

- `@IsString()`
- `@MinLength(1)`

这次你应该理解到的设计点：

- `class-validator` 不是独立价值，它是配合 `ValidationPipe` 工作
- DTO 提供结构，`class-validator` 提供规则，`ValidationPipe` 负责执行

---

## 6. `@Injectable` + 依赖注入

本次使用位置：

- [`AuthService`](/Users/liuxing/Desktop/Space/beike-simulation/next-bff/apps/bff/src/auth/auth.service.ts)
- [`SessionStoreService`](/Users/liuxing/Desktop/Space/beike-simulation/next-bff/apps/bff/src/auth/session-store.service.ts)

这次解决的问题：

- 让登录认证逻辑和 session 管理逻辑可拆分
- 避免 Controller 手动 new `SessionStoreService`
- 让后续 `AuthService` 可以继续组合当前用户解析、权限查询等能力

这次你应该理解到的设计点：

- Provider 是 Nest 容器管理的对象
- `AuthService` 依赖 `SessionStoreService`，但不负责创建它
- 依赖注入把“对象怎么创建”从“业务怎么写”里分离出来了

---

## 7. Service 分层

本次使用位置：

- [`AuthService.login()`](/Users/liuxing/Desktop/Space/beike-simulation/next-bff/apps/bff/src/auth/auth.service.ts)

这次解决的问题：

- 让“账号密码是否正确”从 Controller 挪到 Service
- 让“创建 session”也归到业务服务，而不是混在 HTTP 层
- 让登录逻辑后续更容易扩展成数据库校验、密码加密校验、多端登录限制

这次你应该理解到的设计点：

- Controller 负责传输层
- Service 负责业务规则
- 这次最重要的变化不是代码搬家，而是职责边界开始稳定

---

## 8. `UnauthorizedException`

本次使用位置：

- [`AuthService.login()`](/Users/liuxing/Desktop/Space/beike-simulation/next-bff/apps/bff/src/auth/auth.service.ts)

这次解决的问题：

- 登录失败时不再返回 `null` 让 Controller 判断
- 认证失败可以直接进入 NestJS 异常链路
- 错误状态码和错误语义更一致

这次你应该理解到的设计点：

- 业务服务可以抛出语义明确的异常
- “登录失败”不是普通返回值，而是一个明确的异常状态
- 抛异常后，Controller 不需要再做重复分支判断

---

## 9. 全局 `ExceptionFilter`

本次使用位置：

- [`HttpExceptionFilter`](/Users/liuxing/Desktop/Space/beike-simulation/next-bff/apps/bff/src/common/filters/http-exception.filter.ts)
- [`main.ts`](/Users/liuxing/Desktop/Space/beike-simulation/next-bff/apps/bff/src/main.ts)

这次解决的问题：

- 让登录失败、参数错误、后续权限错误都能走统一错误结构
- 把错误响应格式从 Controller 中抽出来
- 为前端提供稳定的 `success` / `message` / `statusCode` / `path` / `timestamp`

这次你应该理解到的设计点：

- Filter 是异常出口，不是业务判断入口
- 统一异常处理的价值在于“前端可预测”和“后续模块可复用”
- 一旦商品、上传、权限模块也接入，Filter 的价值会进一步放大

---

## 10. HTTP 适配边界

本次使用位置：

- [`createSessionCookie()`](/Users/liuxing/Desktop/Space/beike-simulation/next-bff/apps/bff/src/auth/session-cookie.ts)
- [`AuthController.login()`](/Users/liuxing/Desktop/Space/beike-simulation/next-bff/apps/bff/src/auth/auth.controller.ts)

这次解决的问题：

- session 创建和 cookie 写入被拆开
- `AuthService` 只知道“创建了一个 sessionId”
- Controller 负责把 sessionId 适配成 `Set-Cookie`

这次你应该理解到的设计点：

- Cookie 是 HTTP 细节，不是认证核心逻辑
- 这条边界划清楚后，未来换成 token 或多端登录策略，改动范围更小

---

## 11. 这次迭代真正落地的 NestJS 能力

- [ ] `@Module`
- [ ] `@Controller`
- [ ] `@Post`
- [ ] `@Body`
- [ ] DTO
- [ ] `ValidationPipe`
- [ ] `class-validator`
- [ ] `@Injectable`
- [ ] Provider / DI
- [ ] Service 分层
- [ ] `UnauthorizedException`
- [ ] 全局 `ExceptionFilter`

---

## 12. 这次还没做完的 NestJS 能力

这次登录链路还没有真正落下这些能力，后续应该继续补：

- [ ] `AuthGuard`
- [ ] `@CurrentUser()`
- [ ] 统一成功响应 `Interceptor`
- [ ] requestId + middleware
- [ ] Swagger 文档
- [ ] 登录链路 e2e 测试

---

## 13. 用一句话总结这次迭代

这次登录链路迭代，真正建立起来的是：`Controller 接 HTTP，DTO + Pipe 管参数，Service 管认证逻辑，Provider 管 session，Filter 管统一错误`。这就是 NestJS 在一个真实功能里最基础的一次落地。
