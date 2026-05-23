# NestJS 未使用能力与改造路线 Checklist

来源：`../next-bff/F1007-当前系统NestJS能力地图.md` 第 3 节和第 4 节。

目标：把“当前系统尚未使用、但真实需求会自然引入的 NestJS 能力”和“推荐学习与改造路线”拆成可执行 TODO。每个条目先写 TODO，再说明它背后的真实系统功能。

## 模块一：异步任务 Queue / BullMQ

- [ ] TODO：接入 `@nestjs/bullmq`，建立统一 `QueueModule` 或 `ImageProcessingModule`。

  功能：把图片扫描、压缩、缩略图生成、批量导入、审计导出这类慢任务从 HTTP 请求链路拆出去。接口先返回任务状态，后台 worker 再异步处理。

- [ ] TODO：上传图片后投递 `scan-product-image` job。

  功能：上传接口只负责保存原图并返回 `scanStatus: pending`，扫描、压缩、缩略图生成由队列消费。这样上传请求不会因为图片处理变慢。

- [ ] TODO：实现 `ImageScanProcessor`，处理扫描结果并更新文件状态。

  功能：后台 worker 消费 job，把文件状态更新为 `ready` 或 `rejected`。商品发布接口可以据此阻止未扫描或扫描失败的图片上线。

- [ ] TODO：为审计日志导出增加 `export-audit-log` job。

  功能：大范围审计日志导出不再阻塞接口。前端拿到 jobId 后查询进度或接收实时推送。

- [ ] TODO：定义失败重试和 dead-letter 处理策略。

  功能：病毒扫描失败、对象存储临时不可用、导出任务异常时，可以重试或进入失败队列，而不是直接丢失任务。

## 模块二：周期任务 Schedule / Cron

- [ ] TODO：接入 `@nestjs/schedule` 并在应用启动时注册 `ScheduleModule.forRoot()`。

  功能：把周期性后台维护任务纳入 NestJS 应用上下文，复用现有 Config、Logger、Model、Service。

- [ ] TODO：每天清理 7 天前未绑定商品的临时上传文件。

  功能：避免上传文件长期堆积，降低存储成本，也减少无人引用文件带来的安全风险。

- [ ] TODO：每 5 分钟预热热门商品列表缓存。

  功能：把高频列表查询提前准备好，降低用户首次访问时的慢查询概率。

- [ ] TODO：每天生成登录失败和风控统计。

  功能：把登录失败次数、锁定用户、异常 IP 等数据沉淀为运维和安全分析入口。

- [ ] TODO：定时检查 Redis session 数量和异常增长。

  功能：及时发现 session 泄漏、异常登录风暴或缓存容量问题。

- [ ] TODO：为定时任务加幂等保护。

  功能：多实例部署时，避免同一个清理、统计、预热任务被多个实例重复执行造成脏数据或资源浪费。

## 模块三：实时反馈 SSE / WebSocket Gateway

- [ ] TODO：先用 `@Sse()` 实现单向任务进度推送。

  功能：审计导出、图片扫描、批量导入可以实时把进度推给前端，减少轮询压力。

- [ ] TODO：为长任务设计 `jobId -> progress -> status` 状态模型。

  功能：前端可以显示 `10% / 50% / 100%`，后端也能在任务失败、取消、完成时给出明确状态。

- [ ] TODO：按 `userId` 或 `tenantId` 维护连接分组。

  功能：确保用户只能收到自己的任务进度或本租户消息，避免跨用户、跨租户推送。

- [ ] TODO：需要双向协作时再引入 `@WebSocketGateway()`。

  功能：如果未来出现协同编辑、实时审批、在线操作状态同步，再升级到 WebSocket；不要为了进度条过早引入双向通道。

- [ ] TODO：验证断线重连后的状态恢复。

  功能：浏览器断开连接后，后台任务仍继续执行；用户重新进入页面后能查到当前进度。

## 模块四：统一限流 Throttler

- [ ] TODO：接入 `@nestjs/throttler` 并注册全局 `ThrottlerGuard`。

  功能：把上传、导出、创建用户、重置密码、发送验证码等接口的频率限制统一收口，不再每个接口手写 Redis 计数。

- [ ] TODO：登录接口按 IP 和用户名设置更严格限流。

  功能：当前已有登录风控，但可以把通用限流能力补齐，让暴力尝试在进入认证逻辑前就被拒绝。

- [ ] TODO：上传接口按用户和租户限流。

  功能：避免单个用户或租户短时间上传大量文件拖垮对象存储、扫描队列和带宽。

- [ ] TODO：审计导出接口按用户限流。

  功能：避免高成本导出任务被频繁触发，保护数据库和队列。

- [ ] TODO：确保 429 响应进入统一错误格式。

  功能：前端可以用同一套错误处理逻辑展示限流提示，不需要为 Throttler 单独适配响应结构。

## 模块五：全局认证 APP_GUARD + Public Decorator

- [ ] TODO：把 `AuthGuard` 注册为全局 `APP_GUARD`。

  功能：默认所有接口都需要登录，避免新增 Controller 时忘记写 `@UseGuards()` 导致未授权访问。

- [ ] TODO：把 `PermissionsGuard` 注册为全局或统一组合 Guard。

  功能：权限检查成为默认请求边界，业务接口只需要声明权限点，不需要重复绑定 Guard。

- [ ] TODO：新增 `@Public()` 装饰器。

  功能：登录、CSRF token、health、测试 reset 等公开接口必须显式标记，系统默认安全。

- [ ] TODO：Guard 使用 `Reflector` 判断 `@Public()` 和 `@RequirePermissions()`。

  功能：认证和权限逻辑都通过 metadata 驱动，Controller 只表达“这个接口是否公开、需要什么权限”。

- [ ] TODO：新增一个未写 `@UseGuards()` 的测试接口验证默认保护。

  功能：证明全局 Guard 确实覆盖新增接口，避免安全策略只是“看起来配置了”。

## 模块六：业务事件解耦 EventEmitter / CQRS

- [x] TODO：先接入 `@nestjs/event-emitter`，发布商品变更事件。

  功能：商品创建、编辑、删除后不再由 `CommodityService` 串行处理所有副作用，而是发布 `CommodityCreatedEvent`、`CommodityUpdatedEvent` 等事件。

- [x] TODO：拆出审计日志事件 handler。

  功能：审计写入从主业务 Service 中分离，后续审计字段扩展不需要频繁修改商品主流程。

- [x] TODO：拆出缓存失效事件 handler。

  功能：商品变更后统一清理或刷新商品列表缓存，缓存策略独立演进。

- [x] TODO：预留搜索索引和通知 handler。

  功能：未来接搜索服务、站内信、邮件通知时，只新增订阅者，不把副作用继续塞回主 Service。

- [x] TODO：明确 handler 失败是否影响主流程。

  功能：审计失败、缓存清理失败、通知失败的业务语义不同。需要决定失败时回滚、重试、告警还是忽略。

- [x] TODO：复杂命令/查询边界清晰后再考虑 `@nestjs/cqrs`。

  功能：CQRS 适合命令、查询、事件边界已经变复杂的场景；当前先用事件解耦，不急着引入完整 CQRS 结构。

## 模块七：标准健康检查 Terminus

- [ ] TODO：接入 `@nestjs/terminus`。

  功能：把当前自写 health 检查标准化，方便接 Kubernetes、负载均衡和监控平台。

- [ ] TODO：用 MongoDB indicator 检查数据库 ready 状态。

  功能：数据库不可用时 `/ready` 返回 503，让部署平台停止转发流量。

- [ ] TODO：写 Redis 自定义 health indicator。

  功能：Redis session、限流、队列都依赖 Redis。Redis 异常应该体现在 readiness 检查里。

- [ ] TODO：写 backend HTTP indicator。

  功能：BFF 依赖 backend 时，backend 不可用会影响业务接口，ready 应该能反映这个依赖状态。

- [ ] TODO：保留 release metadata、version、commitSha。

  功能：健康检查不仅告诉“活着没”，还要帮助定位当前运行的版本。

- [ ] TODO：区分 live 和 ready。

  功能：`live` 只判断进程是否活着，`ready` 判断依赖是否可用。下游短暂故障不应该直接让容器被杀死。

## 模块八：多端认证 Passport + JWT Strategy

- [ ] TODO：保留浏览器后台的 HttpOnly Cookie Session。

  功能：当前系统面向浏览器后台，Cookie session 仍然是合理主路径，不应为了学习 JWT 推翻现有认证。

- [ ] TODO：出现移动端、CLI、第三方 API 诉求时再接入 `@nestjs/passport` 和 `@nestjs/jwt`。

  功能：非浏览器客户端不适合依赖 Cookie session，需要 Bearer access token。

- [ ] TODO：实现 `JwtStrategy` 和 `JwtAuthGuard`。

  功能：接口可以通过 `Authorization: Bearer <token>` 解析当前用户，与 session guard 并存。

- [ ] TODO：设计 access token + refresh token 续期机制。

  功能：短期 access token 控制泄漏风险，refresh token 管理续期、轮换和撤销。

- [ ] TODO：统一 `@CurrentUser()` 对 session 和 JWT 两种入口的输出。

  功能：Controller 和 Service 不关心用户来自 Cookie 还是 Bearer token，只依赖统一当前用户对象。

## 模块九：服务间通信 Microservices

- [ ] TODO：当前阶段暂不拆微服务。

  功能：当前 MVP 更适合先练清单体模块边界、事件、队列、幂等和重试。过早拆服务会增加部署、消息、事务和排障复杂度。

- [ ] TODO：当库存、订单、搜索、审计、通知需要独立部署时，再接入 `@nestjs/microservices`。

  功能：服务间通过 Redis、RabbitMQ、Kafka、TCP 等 transport 传递消息，而不是都通过 BFF 同步 HTTP 调用。

- [ ] TODO：设计 `commodity.created`、`commodity.updated` 等事件 schema。

  功能：跨服务消息必须有稳定字段、版本、traceId、tenantId 和幂等 key。

- [ ] TODO：消费者使用 `@EventPattern()` 或 `@MessagePattern()`。

  功能：搜索、审计、通知等服务可以独立消费事件并更新自己的存储。

- [ ] TODO：验证重复消息不会造成重复副作用。

  功能：消息系统通常至少一次投递，消费者必须幂等，避免重复审计、重复通知、重复索引。

## 模块十：复杂聚合查询 GraphQL

- [ ] TODO：当前 REST 足够支撑 MVP，暂不引入 GraphQL。

  功能：避免为了技术完整性增加第二套 API 层。现阶段 REST Controller + Service 更直接。

- [ ] TODO：当详情页出现复杂聚合查询痛点时再引入 `@nestjs/graphql`。

  功能：商品详情、审计记录、操作者信息、权限状态、图片信息等多实体数据可以一次 query 获取。

- [ ] TODO：Resolver 复用现有 Service，不绕过 RBAC。

  功能：GraphQL 只是 API 表达层，权限、审计、业务规则仍然复用已有 Service 和 Guard 思路。

- [ ] TODO：引入 DataLoader 防止 N+1 查询。

  功能：复杂字段解析时避免对每条记录重复查询用户、审计或图片信息。

- [ ] TODO：验证字段选择不会泄露无权限数据。

  功能：GraphQL 允许前端选择字段，更要确保权限过滤在后端强制执行。

## 学习和改造路线 Checklist

### 阶段一：把当前请求链路讲透

- [ ] TODO：画清一条商品创建请求的 NestJS 生命周期。

  功能：能解释请求如何经过 Middleware、Guard、Pipe、Controller、Service、Interceptor、Filter，而不是只背 NestJS 名词。

- [ ] TODO：梳理 400、401、403、404、500 分别从哪里产生。

  功能：建立错误边界意识。DTO 错误、未登录、无权限、资源不存在、服务异常应该各有明确来源。

- [ ] TODO：区分 DTO、Mongoose Schema、业务类型。

  功能：DTO 管请求输入，Schema 管持久化结构，业务类型管 Service 内部规则。三者混在一起会导致校验、存储和业务演进互相污染。

- [ ] TODO：补齐当前链路相关测试。

  功能：用 `pnpm test:bff`、`pnpm test:bff:e2e`、`pnpm lint:bff` 验证当前骨架稳定，再开始加新能力。

### 阶段二：补异步后台能力

- [ ] TODO：先做图片扫描队列。

  功能：上传后立即返回 `pending`，worker 扫描完成后变成 `ready/rejected`，这是最容易观察的异步任务闭环。

- [ ] TODO：再做审计日志导出队列。

  功能：把大范围导出从同步接口移走，练习 jobId、进度、失败重试和结果下载。

- [ ] TODO：补定时清理临时文件。

  功能：把文件生命周期管理从“靠人记得清”变成系统自动维护。

- [ ] TODO：验证“请求返回”和“后台任务完成”是两个状态。

  功能：前端和后端都要接受异步任务模型：接口成功只代表任务已接收，不代表处理已完成。

### 阶段三：补实时反馈和生产治理

- [ ] TODO：给导出或扫描任务加 SSE 进度推送。

  功能：用户能实时看到长任务进度，不需要频繁刷新或轮询。

- [ ] TODO：给上传、导出、登录等高风险接口补统一限流。

  功能：避免用户误操作或恶意请求拖垮系统，也让风控逻辑从单点手写升级为统一能力。

- [ ] TODO：把认证和权限升级为默认全局保护。

  功能：新增接口默认要求登录，公开接口必须 `@Public()`，降低漏保护风险。

- [ ] TODO：用 Terminus 标准化 health。

  功能：为部署平台提供明确的 live/ready 语义，并把 MongoDB、Redis、backend 依赖状态纳入 readiness。

### 阶段四：补架构解耦能力

- [ ] TODO：商品变更后发布事件，不再把所有副作用写在主 Service。

  功能：审计、缓存、通知、搜索同步各自成为 handler，主流程更清楚，副作用可独立测试。

- [ ] TODO：为事件 handler 设计 traceId、tenantId、operatorId。

  功能：事件链路可追踪，排查问题时能从一次商品操作串到审计、缓存、通知等副作用。

- [ ] TODO：为事件和队列任务补幂等策略。

  功能：重复事件、任务重试、worker 重启都不会造成重复写入或重复通知。

- [ ] TODO：暂缓微服务拆分。

  功能：先把单体内模块边界、事件、队列、测试、观测练清楚。只有独立部署、独立扩容、组织边界真的出现时再拆服务。

## 验收标准

- [ ] TODO：每个新增 NestJS 能力都能回答“当前系统哪个真实问题需要它”。

  功能：避免为了学习 API 而堆技术，确保能力来自真实业务压力。

- [ ] TODO：每个新增能力都能标出它在请求链路或应用生命周期的位置。

  功能：知道它是在 Controller 前、Service 内、响应后、后台 worker、定时器还是服务间消息里生效。

- [ ] TODO：每个新增能力都要有运行验证或测试验证。

  功能：例如队列看 job 状态，SSE 看进度消息，Throttler 看 429，Terminus 看依赖挂掉后的 503。

- [ ] TODO：每个新增能力都要说明它替代了哪些重复代码或不稳定边界。

  功能：比如限流替代手写 Redis 计数，事件替代 Service 内副作用堆叠，全局 Guard 替代每个 Controller 手动绑定。

- [ ] TODO：每个新增能力都要判断是否会让 MVP 过重。

  功能：GraphQL、Microservices、CQRS 这类能力只有真实复杂度出现时才引入，避免系统学习路线失焦。
