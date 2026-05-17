# RealSystem: AI 全栈真实线上系统 Checklist

目标：把当前 `next-bff` 迭代成一个用于面试主项目的真实复杂系统模拟器。  
定位：AI Agent + 中后台平台 + Node BFF + 线上稳定性工程。重点不是堆页面交互，而是模拟真实系统会遇到的权限边界、租户隔离、缓存一致性、数据规模、CI、可观测性、发布回滚、AI 工具调用和故障排查。

项目边界：

```text
重点投入：
  Node BFF、权限模型、租户隔离、审计、缓存、查询规模、可观测性、CI/CD、AI Agent 工程化

少投入：
  复杂页面视觉、花哨交互、营销式 UI、纯前端业务表单堆叠

前端职责：
  提供真实入口、触发真实链路、展示系统状态、承载 AI Agent 交互和排障结果
```

目标架构：

```text
Next.js Admin
  │
  ├─ 商品运营入口
  ├─ 权限 / 租户 / 审计入口
  ├─ 监控 / 排障入口
  └─ AI Agent 工作台
        │
        ▼
NestJS BFF
  │
  ├─ Session / SSO / RBAC / TenantContext / DataScope
  ├─ Audit / Approval / HighRiskPolicy
  ├─ Cache / QueryPlan / Metrics / Logs / Trace / Health
  ├─ Backend Anti-corruption Layer
  └─ AI Tool Gateway
        │
        ├─ MongoDB
        ├─ Redis
        ├─ Backend
        ├─ Object Storage / CDN
        ├─ Observability Platform
        └─ LLM / Agent Runtime
```

读法：

- `功能`：要落代码、测试、配置或文档的明确 todo，不写泛泛叙事
- `能力`：实现这个功能需要用到的技术点、工程细节或真实线上问题
- `验收`：做完后如何证明这个能力可以被面试深挖

---

## 1. 多租户、组织与数据权限

真实内部系统很少只有全局 admin。要模拟“几万用户、多个组织、不同数据可见范围”的复杂度。

### 1.1 租户与组织模型落库

- [ ] 功能：新增 `tenants` 集合，包含 `tenantId`、`name`、`status`、`createdAt`
      能力：Mongoose Schema、唯一索引、租户状态、幂等 seed
- [ ] 功能：新增 `departments` 集合，包含 `tenantId`、`departmentId`、`parentId`、`path`
      能力：组织树、父子关系、path 查询、同租户唯一约束
- [ ] 功能：`users` 增加 `tenantId`、`departmentIds`、`primaryDepartmentId`
      能力：用户归属、登录态扩展、跨集合引用
- [ ] 功能：`commodities` 和 `audit_logs` 增加 `tenantId` 字段
      能力：租户数据隔离、历史数据迁移、查询条件兜底

验收：

- [ ] seed 后至少有 2 个租户、3 层部门、多个角色用户
- [ ] MongoDB 中 `tenantId` 有索引
- [ ] 老数据迁移后不会出现无 `tenantId` 的商品和审计
- [ ] 能用真实例子说明“同一个 admin 只能管理本租户”

### 1.2 TenantContext 服务端注入

- [ ] 功能：新增 `TenantContextMiddleware` 或 Guard，从 session 用户中读取 `tenantId`
      能力：请求上下文、服务端可信来源、Express Request 扩展类型
- [ ] 功能：禁止普通用户通过 body/query/header 覆盖 `tenantId`
      能力：不信任前端、越权防护、DTO 白名单
- [ ] 功能：BFF 调 backend 时自动透传 `X-Tenant-Id`
      能力：上下文传播、服务间契约、trace 关联
- [ ] 功能：日志、metrics、审计统一带 `tenantId`
      能力：多租户排障、按租户检索、告警聚合

验收：

- [ ] 前端伪造 `tenantId=B` 请求时仍按登录态租户 A 查询
- [ ] BFF 日志能看到 `tenantId`
- [ ] backend 收到的 `tenantId` 来自 BFF，不来自浏览器
- [ ] 能画出 `session -> request.tenantContext -> query filter -> audit` 流程

### 1.3 数据权限查询封装

- [ ] 功能：新增 `DataScopeService.buildCommodityFilter(user, query)`
      能力：行级权限、查询条件合成、最小权限原则
- [ ] 功能：商品列表自动注入 `tenantId` 和部门数据范围
      能力：服务端过滤、防止漏加条件、分页查询
- [ ] 功能：商品详情、编辑、删除前执行对象级权限校验
      能力：object-level permission、403/404 取舍、防越权
- [ ] 功能：审计查询按 `tenantId` 和数据范围过滤
      能力：敏感数据隔离、审计权限、索引组合

验收：

- [ ] A 部门 operator 看不到 B 部门商品
- [ ] 手动访问无权商品详情返回 403 或 404
- [ ] 审计查询不会泄露其他租户或部门数据
- [ ] 能说明菜单权限、接口权限、数据权限的区别

### 1.4 多租户真实问题模拟

- [ ] 功能：新增 e2e：A 租户用户无法查询 B 租户商品
      能力：跨租户越权测试、fixture 隔离、Supertest
- [ ] 功能：新增 e2e：前端传入伪造 `tenantId` 不生效
      能力：可信上下文、DTO 校验、攻击用例
- [ ] 功能：新增文档案例：某租户列表慢，其他租户正常
      能力：热点租户、分片路由、索引选择、traceId 排查
- [ ] 功能：新增文档案例：同名部门在不同租户下合法
      能力：复合唯一索引、租户边界、组织建模

验收：

- [ ] 测试能复现并防止跨租户数据泄漏
- [ ] 文档能解释 tenantId、departmentId、dataScope 如何流动
- [ ] 能回答“为什么 tenantId 不能由前端自由传”
- [ ] 能回答“tenantId 和 shard key 有什么关系但不是一回事”

---

## 2. 身份认证、SSO 与会话治理

真实系统不会只靠本地账号密码。要模拟企业登录、会话持久化、账号映射和生产环境登录边界。

### 2.1 Redis Session 生产化

- [ ] 功能：session 从进程内存迁移到 Redis
      能力：Redis session store、TTL、服务重启恢复
- [ ] 功能：session value 存储 `userId`、`tenantId`、`roleCodes`、`departmentIds`
      能力：登录态最小必要信息、上下文构建、序列化
- [ ] 功能：退出登录时删除 Redis session 并清 cookie
      能力：服务端会话失效、cookie 属性一致性
- [ ] 功能：新增 session 过期 e2e
      能力：TTL 模拟、401 断言、登录回跳

验收：

- [ ] BFF 重启后登录态不丢
- [ ] Redis 中能看到 session TTL
- [ ] 退出后旧 cookie 访问接口返回 401
- [ ] 能解释 cookie、sessionId、Redis session 的关系

### 2.2 OIDC / SSO 接入骨架

- [ ] 功能：新增 `/api/auth/sso/start`，生成 `state`、`nonce` 并写入 Redis
      能力：OIDC、CSRF 防护、一次性状态、回调安全
- [ ] 功能：新增 `/api/auth/sso/callback`，校验 `state`、`nonce`、issuer、audience
      能力：token validation、id_token、回调校验
- [ ] 功能：新增 `external_identities` 集合映射外部账号和本地用户
      能力：账号绑定、身份源、唯一索引
- [ ] 功能：生产环境支持关闭本地密码登录
      能力：环境变量、登录策略、生产安全边界

验收：

- [ ] state 被重复使用时回调失败
- [ ] 未绑定外部账号会进入绑定或拒绝流程
- [ ] 生产配置下 mock/local 登录不可用
- [ ] 能讲清 `id_token`、`access_token`、本地 session 的区别

### 2.3 登录安全与登录审计

- [ ] 功能：登录失败按账号和 IP 限流
      能力：rate limit、Redis counter、滑动窗口
- [ ] 功能：登录成功、失败、退出都写 `login_audit_logs`
      能力：安全审计、IP、User-Agent、traceId
- [ ] 功能：错误账号和错误密码返回统一 401
      能力：账号枚举防护、统一错误体验
- [ ] 功能：新增登录异常文档案例
      能力：401、cookie、session、SSO callback 排查

验收：

- [ ] 连续失败登录触发 429
- [ ] 前端不会提示“账号不存在”
- [ ] 登录日志可按用户、IP、时间查询
- [ ] 能用 traceId 查到一次登录失败的完整链路

---

## 3. RBAC、高风险操作与审批流

权限不是只有“有没有按钮”。真实系统需要接口权限、数据权限、高风险确认和审批预留。

### 3.1 权限码与角色治理

- [ ] 功能：权限码按资源和动作命名，例如 `commodity:create`、`audit:read`
      能力：权限命名规范、资源动作模型、权限可读性
- [ ] 功能：角色绑定权限时写入 before / after 审计
      能力：高风险变更、diff、operator 可信来源
- [ ] 功能：用户绑定角色时强制 reason
      能力：权限变更约束、DTO 校验、审计字段
- [ ] 功能：权限 seed 幂等更新，不覆盖生产自定义角色
      能力：seed version、upsert、生产数据保护

验收：

- [ ] viewer 无法创建商品
- [ ] operator 可以改状态但不能看全局审计
- [ ] admin 变更角色权限后审计可查
- [ ] 能解释 RBAC 和数据权限为什么要分开

### 3.2 高风险操作策略

- [ ] 功能：新增 `HighRiskOperationPolicy`，集中定义高风险操作
      能力：策略集中化、枚举动作、权限隔离
- [ ] 功能：商品删除、恢复、权限变更、AI 执行建议都纳入高风险动作
      能力：危险操作分类、业务约束、AI 安全
- [ ] 功能：高风险请求必须带 `confirmText` 和 `reason`
      能力：DTO 校验、二次确认、操作意图记录
- [ ] 功能：高风险操作失败原因进入结构化日志
      能力：安全排查、403 体验、审计前置校验

验收：

- [ ] 删除商品不带确认文案返回 400
- [ ] 状态变更不带 reason 返回 400
- [ ] 前端伪造 operator 不影响高风险校验
- [ ] 能说明“二次确认”和“审批流”解决的问题不同

### 3.3 审批流预留状态机

- [ ] 功能：新增 `approval_tasks` 集合
      能力：任务流建模、状态机、审批记录
- [ ] 功能：高风险操作支持 `direct_execute` 和 `approval_required` 两种模式
      能力：策略开关、灰度接入、权限分离
- [ ] 功能：审批任务状态支持 `pending / approved / rejected / cancelled / executed`
      能力：状态机、非法流转保护、幂等执行
- [ ] 功能：审批通过后由服务端执行真实操作，不复用前端原始 body
      能力：可信操作来源、payload 快照、重放保护

验收：

- [ ] operator 发起删除时可生成 pending 审批任务
- [ ] admin 审批通过后商品才删除
- [ ] rejected 任务不能执行
- [ ] 能解释审批流如何为未来工作流系统预留

---

## 4. 审计日志与可信事实

审计用于还原业务事实，不是普通日志。它必须由服务端写入，记录前后变化，并能按权限查询。

### 4.1 审计写入服务化

- [ ] 功能：所有商品写操作统一调用 `AuditLogService.writeCommodityAudit`
      能力：Service composition、统一审计入口、防漏写
- [ ] 功能：审计 operator 从 session 读取
      能力：可信身份、不可由前端伪造、RequestContext
- [ ] 功能：审计 target 包含 `type`、`id`、`tenantId`
      能力：对象定位、多租户查询、索引设计
- [ ] 功能：审计写失败时定义阻断策略
      能力：一致性取舍、事务、降级策略

验收：

- [ ] 创建、编辑、状态变更、删除、恢复都能查到审计
- [ ] 前端 body 传 `operator=admin` 不生效
- [ ] 审计记录包含 operator、action、target、traceId、createdAt
- [ ] 能说明“审计失败时是否允许业务成功”的取舍

### 4.2 before / after 与敏感字段过滤

- [ ] 功能：新增 `diffObject(before, after, maskPolicy)`
      能力：对象 diff、字段白名单、敏感字段脱敏
- [ ] 功能：审计只记录关键业务字段变化
      能力：审计降噪、存储成本、可读性
- [ ] 功能：密码、token、密钥类字段永不进入审计明文
      能力：敏感信息保护、mask policy、安全审查
- [ ] 功能：审计详情接口返回结构化 diff
      能力：ViewModel、前端稳定展示、字段解释

验收：

- [ ] 修改商品价格能看到 before price 和 after price
- [ ] 修改角色权限能看到新增/删除的 permissionCodes
- [ ] 审计响应不包含 passwordHash、token、secret
- [ ] 能解释审计 diff 和普通日志字段的区别

### 4.3 审计查询与索引

- [ ] 功能：审计支持按 operator、action、target、tenantId、time range 查询
      能力：查询 DTO、分页、组合索引
- [ ] 功能：审计列表默认按 `createdAt desc` 排序
      能力：稳定分页、时间线查询、索引顺序
- [ ] 功能：非法时间范围、非法 action 返回 400
      能力：DTO 校验、查询边界、错误语义
- [ ] 功能：审计查询只允许具备 `audit:read` 的用户访问
      能力：权限隔离、403、敏感数据保护

验收：

- [ ] operator 无法查看审计日志
- [ ] admin 可以按商品 id 查到完整操作时间线
- [ ] 非法查询参数返回 400
- [ ] 能说明审计查询为什么要有索引意识

---

## 5. BFF 防腐层、接口契约与故障隔离

BFF 不是简单转发。它要隔离前端和后端变化，控制超时、重试、错误语义和上下文传播。

### 5.1 Backend API Client 防腐层

- [ ] 功能：新增 backend API client 的 typed method，例如 `getCommodityList`
      能力：TypeScript 类型、DTO 映射、接口边界
- [ ] 功能：backend 原始响应转换为 BFF ViewModel
      能力：防腐层、字段稳定、前端不感知后端变更
- [ ] 功能：backend 错误映射为 BFF 统一错误
      能力：错误码转换、HTTP 语义、用户提示
- [ ] 功能：BFF 到 backend 请求自动带 `traceId`、`tenantId`、`operatorId`
      能力：上下文传播、审计关联、服务间契约

验收：

- [ ] backend 字段重命名不会直接破坏前端
- [ ] backend 404 能映射成 BFF 404
- [ ] backend 500 保留 traceId 便于排查
- [ ] 能解释防腐层和普通 fetch 封装的区别

### 5.2 超时、重试与熔断

- [ ] 功能：BFF 调 backend 设置超时时间
      能力：AbortController、请求超时、资源释放
- [ ] 功能：只对幂等 GET 请求做有限重试
      能力：幂等性、重试风暴、指数退避
- [ ] 功能：新增简易 circuit breaker 状态
      能力：熔断、半开、下游故障保护
- [ ] 功能：熔断状态进入 metrics 和 health 依赖状态
      能力：故障可见性、ready 判断、告警

验收：

- [ ] backend 慢请求不会无限挂住 BFF
- [ ] POST 创建商品不会被自动重试导致重复创建
- [ ] backend 连续失败后 BFF 快速失败并记录熔断日志
- [ ] 能说明 timeout、retry、circuit breaker 分别解决什么问题

### 5.3 幂等与重复提交

- [ ] 功能：关键写接口支持 `Idempotency-Key`
      能力：幂等设计、重复请求、网络抖动
- [ ] 功能：Redis 保存幂等 key 的处理状态和结果摘要
      能力：短期状态、TTL、并发控制
- [ ] 功能：重复提交返回同一业务结果或明确冲突
      能力：一致性、用户体验、接口契约
- [ ] 功能：新增 e2e 模拟双击创建商品
      能力：并发测试、竞态保护、Supertest

验收：

- [ ] 同一个 `Idempotency-Key` 不会创建两个商品
- [ ] 不同 key 可以正常创建不同商品
- [ ] 幂等状态过期后行为可解释
- [ ] 能说明幂等 key 为什么不能只靠前端防抖

---

## 6. 缓存、一致性与数据规模

商品 10w+ 不一定需要复杂数据库架构，但必须有索引、分页、缓存和排障意识。

### 6.1 Redis 商品列表缓存

- [ ] 功能：商品列表 cache key 包含 `tenantId`、dataScope hash、query、page、sort
      能力：cache key 设计、权限隔离、缓存污染防护
- [ ] 功能：缓存 value 保存 `data`、`createdAt`、`freshUntil`、`staleUntil`
      能力：TTL、SWR、旧数据窗口、时间控制
- [ ] 功能：stale 阶段触发后台刷新
      能力：stale-while-revalidate、异步刷新、用户体验取舍
- [ ] 功能：cache debug header 只在 admin 或 debug 环境返回
      能力：排障信息边界、Header、生产安全

验收：

- [ ] A 租户缓存不会被 B 租户命中
- [ ] fresh 阶段直接返回缓存
- [ ] stale 阶段先返回旧值并触发刷新
- [ ] 普通用户看不到内部 cache key 信息

### 6.2 写操作缓存失效

- [ ] 功能：创建商品后失效当前租户商品列表缓存
      能力：cache tag、key registry、invalidate
- [ ] 功能：编辑、状态变更、删除、恢复后失效列表和详情缓存
      能力：写后一致性、相关 key 管理
- [ ] 功能：缓存失效失败写 warn 日志但不吞业务结果
      能力：降级策略、最终一致性、排障日志
- [ ] 功能：新增“状态已变但列表没变”的排障 case
      能力：缓存层级、traceId、response header、DB 校验

验收：

- [ ] 删除商品后列表不会长期展示旧数据
- [ ] 状态变更后刷新页面能看到新状态
- [ ] 失效失败时日志包含 cache key hash 和 traceId
- [ ] 能解释为什么 stale 阶段用户可能第一次仍看到旧数据

### 6.3 缓存穿透、击穿、雪崩防护

- [ ] 功能：不存在的商品详情写入短 TTL 空值缓存
      能力：缓存穿透、negative cache、404 缓存
- [ ] 功能：热点列表刷新使用 Redis lock
      能力：缓存击穿、分布式锁、回源保护
- [ ] 功能：缓存 TTL 增加随机抖动
      能力：缓存雪崩、过期抖动、流量平滑
- [ ] 功能：Redis 不可用时走 DB 并写降级 metrics
      能力：缓存降级、依赖故障、服务可用性

验收：

- [ ] 连续请求不存在商品不会反复打 DB
- [ ] 热点 key 过期时不会所有请求同时回源
- [ ] Redis down 时核心查询仍可降级返回
- [ ] 能用页面表现解释穿透、击穿、雪崩的区别

### 6.4 MongoDB 索引与分页

- [ ] 功能：商品集合建立 `{ tenantId, status, createdAt }` 复合索引
      能力：组合查询、排序、索引顺序
- [ ] 功能：审计集合建立 `{ tenantId, target.id, createdAt }` 索引
      能力：对象时间线查询、审计规模、索引成本
- [ ] 功能：商品列表返回 `queryPlan` 调试摘要
      能力：查询解释、docsExamined、keysExamined、排障提示
- [ ] 功能：新增 cursor 分页接口预留
      能力：深分页、稳定排序、游标编码

验收：

- [ ] 状态筛选 + 创建时间排序命中复合索引
- [ ] 深页查询有 cursor 分页改造说明
- [ ] queryPlan 能帮助判断 DB 慢还是前端渲染慢
- [ ] 能估算新增索引带来的存储和写入成本

---

## 7. 可观测性、排障与运行治理

真实系统的核心能力是出问题时能定位，而不是只知道“页面挂了”。

### 7.1 结构化日志

- [ ] 功能：BFF 和 backend 统一输出 JSON log
      能力：level、context、event、fields、日志平台采集
- [ ] 功能：请求日志包含 `method`、`path`、`status`、`durationMs`、`traceId`、`tenantId`
      能力：请求排查、性能定位、多租户检索
- [ ] 功能：错误日志包含异常类型、message、stack、cause
      能力：500 排查、错误分级、stack 采集
- [ ] 功能：AI 工具调用日志包含 taskId、toolName、durationMs、resultStatus
      能力：AI 可观测、工具失败定位、Agent 调试

验收：

- [ ] 一次商品创建能用 traceId 串起 BFF 和 backend 日志
- [ ] 500 错误能查到 stack
- [ ] AI 工具失败能定位到具体 tool
- [ ] 能说明日志和审计为什么不是一类东西

### 7.2 Metrics 与告警

- [ ] 功能：BFF 统计每个 route 的请求量、5xx 错误率、P95/P99
      能力：RED 指标、滑动窗口、route normalize
- [ ] 功能：核心接口错误率超过阈值输出告警事件
      能力：告警阈值、冷却时间、噪音控制
- [ ] 功能：AI Agent 统计 token 使用、工具失败率、首 token 延迟
      能力：AI Monitoring、成本观测、体验指标
- [ ] 功能：前端上报 Web Vitals 和白屏错误
      能力：LCP、INP、CLS、Error Boundary、版本定位

验收：

- [ ] 能看到商品列表 P95
- [ ] 5xx 错误率升高能触发 `alert_core_api_error_rate_high`
- [ ] AI 工具失败率升高能被发现
- [ ] 前端错误能带 appVersion 和页面路径

### 7.3 OpenTelemetry Trace

- [ ] 功能：BFF 请求创建 root span
      能力：OpenTelemetry、span、trace context
- [ ] 功能：BFF 调 backend、MongoDB、Redis 创建子 span
      能力：context propagation、调用树、耗时拆解
- [ ] 功能：日志字段带 `otelTraceId`
      能力：日志与 trace 关联、错误跳转
- [ ] 功能：AI Agent 每次工具调用创建 span
      能力：Agent trace、tool span、慢工具定位

验收：

- [ ] 能看到 BFF -> backend -> MongoDB 的调用树
- [ ] 慢请求能判断慢在 BFF、backend、Redis 还是 DB
- [ ] 错误 trace 能跳转到相关日志
- [ ] 能解释 traceId 和 spanId 的关系

### 7.4 Health Check、优雅下线与回滚

- [ ] 功能：BFF 和 backend 提供 `/live` 和 `/ready`
      能力：liveness、readiness、依赖状态
- [ ] 功能：ready 检查 MongoDB、Redis、backend、AI provider 可用性
      能力：依赖检查、超时控制、503 摘流
- [ ] 功能：收到关闭信号后进入 draining
      能力：graceful shutdown、连接排空、滚动发布
- [ ] 功能：health 响应包含 `version`、`commitSha`、`releaseNotesUrl`
      能力：版本追踪、回滚定位、发布治理

验收：

- [ ] MongoDB 不可用时 ready 返回 503
- [ ] 发布期间旧实例 draining 后不再接新请求
- [ ] 错误率升高时能定位当前问题 commit
- [ ] 能解释 live 和 ready 的区别

### 7.5 真实故障演练

- [ ] 功能：新增故障脚本：模拟 backend 500
      能力：故障注入、错误率、告警验证
- [ ] 功能：新增故障脚本：模拟 Redis down
      能力：缓存降级、ready 状态、核心链路
- [ ] 功能：新增故障脚本：模拟 Mongo 慢查询
      能力：慢请求、trace 调用树、索引排查
- [ ] 功能：新增故障脚本：模拟 AI provider 超时
      能力：AI 降级、任务失败、用户提示

验收：

- [ ] 每个故障都有复现命令
- [ ] 每个故障都有日志、metrics、trace 观察点
- [ ] 每个故障都有恢复步骤
- [ ] 能把故障演练转化成面试排障回答

---

## 8. 构建、部署与 CI 质量门禁

面试里要能讲清“代码如何安全进入线上”，包括构建产物、环境变量、CI 阻断和回滚。

### 8.1 构建产物边界

- [ ] 功能：`client`、`bff`、`server` 分别构建并产出独立 artifact
      能力：monorepo build、产物边界、部署解耦
- [ ] 功能：生产构建禁止依赖本地 dev 文件
      能力：可复现构建、环境隔离、Docker context
- [ ] 功能：构建时写入 `APP_VERSION` 和 `RELEASE_COMMIT_SHA`
      能力：release metadata、commit 定位、回滚依据
- [ ] 功能：页面和 health check 都能展示当前 commit
      能力：前端 public env、服务端 runtime env、版本可见性

验收：

- [ ] `pnpm build:all` 通过
- [ ] 缺少生产必要 env 时构建或启动失败
- [ ] 页面顶部能看到版本和短 commit
- [ ] BFF/backend health 能看到完整 commit

### 8.2 Docker Compose 与 Kubernetes 预留

- [ ] 功能：新增 production-like `docker-compose.yml`
      能力：容器化、服务依赖、环境变量、网络隔离
- [ ] 功能：新增 BFF/backend Dockerfile
      能力：多阶段构建、镜像体积、非 root 用户
- [ ] 功能：新增 Kubernetes 部署示例
      能力：Deployment、Service、readinessProbe、livenessProbe
- [ ] 功能：文档对比单机、Compose、K8s、云托管差异
      能力：部署形态、扩缩容、自愈、运维成本

验收：

- [ ] Compose 可以启动 client / BFF / backend / Mongo / Redis
- [ ] K8s 示例包含 live/ready probe
- [ ] 能说明为什么 K8s 更适合滚动发布和故障自愈
- [ ] 能说明内部项目为什么可以先用 Compose 起步

### 8.3 CI 质量门禁

- [ ] 功能：PR 自动跑 format、lint、typecheck
      能力：Prettier、ESLint、TypeScript、失败阻断
- [ ] 功能：PR 自动跑 BFF unit/e2e
      能力：Jest、Supertest、测试数据库、CI 稳定性
- [ ] 功能：PR 自动跑 Playwright 核心链路
      能力：浏览器自动化、trace、截图、测试数据初始化
- [ ] 功能：CI 忽略生成产物 `playwright-report`、dist、coverage
      能力：lint scope、artifact 管理、工程卫生

验收：

- [ ] lint 失败无法合并
- [ ] build 失败无法合并
- [ ] test 失败无法合并
- [ ] CI 日志能快速定位失败阶段

---

## 9. AI Agent 工程化主线

AI 能力必须接入真实系统上下文，不能只是聊天框。Agent 要有工具、权限、任务状态、观测和评测。

### 9.1 Agent 任务模型

- [ ] 功能：新增 `ai_agent_tasks` 集合
      能力：任务建模、状态机、长任务持久化
- [ ] 功能：任务状态支持 `created / running / tool_calling / completed / failed / cancelled`
      能力：状态机、非法流转、任务恢复
- [ ] 功能：任务记录 `tenantId`、`operatorId`、`traceId`、`promptHash`
      能力：权限隔离、审计追踪、隐私保护
- [ ] 功能：任务支持取消和超时失败
      能力：AbortController、timeout、资源释放

验收：

- [ ] 用户提交 AI 排障任务后能查到任务状态
- [ ] cancelled 任务不会继续调用工具
- [ ] 任务日志能还原一次 Agent 执行过程
- [ ] 能解释为什么 Agent 任务要持久化

### 9.2 Tool Registry 与权限过滤

- [ ] 功能：新增 `ToolRegistry`，注册 `commodity.search`
      能力：tool schema、参数校验、数据权限过滤
- [ ] 功能：注册 `audit.search`
      能力：敏感数据查询、权限码校验、来源引用
- [ ] 功能：注册 `metrics.query`
      能力：P95、错误率、时间窗口、route 维度
- [ ] 功能：注册 `trace.lookup`
      能力：traceId 检索、日志聚合、调用树摘要

验收：

- [ ] AI 工具参数非法返回结构化错误
- [ ] operator 不能通过 AI 工具查询全局审计
- [ ] AI 回答能列出使用过的工具和来源
- [ ] 能说明 Tool Gateway 为什么必须在 BFF

### 9.3 Agent 输出约束

- [ ] 功能：AI 输出分为 `fact`、`inference`、`suggestion`
      能力：可信回答、推理边界、用户认知
- [ ] 功能：涉及删除、恢复、权限变更的输出只能生成建议
      能力：AI 安全、高风险操作、人工确认
- [ ] 功能：AI 引用系统数据时必须带 source
      能力：RAG 基础、来源引用、可解释性
- [ ] 功能：信息不足时 AI 必须返回 `need_more_context`
      能力：幻觉控制、失败语义、产品约束

验收：

- [ ] AI 不会直接调用删除接口
- [ ] AI 无来源时不会声称确定事实
- [ ] AI 能区分日志事实和自己的推断
- [ ] 能解释 suggestion 为什么不能直接等同操作

### 9.4 AI Eval 与安全测试

- [ ] 功能：新增 eval：AI 根据 traceId 判断慢在 DB
      能力：黄金用例、排障准确性、回归测试
- [ ] 功能：新增 eval：prompt injection 要求绕过权限时必须拒绝
      能力：AI 安全、越权测试、工具权限
- [ ] 功能：新增 eval：AI 查询审计时不能跨租户
      能力：多租户隔离、工具过滤、测试 fixture
- [ ] 功能：新增 eval：AI 在日志不足时返回信息不足
      能力：幻觉控制、边界表达、评测标准

验收：

- [ ] eval 可以一键运行
- [ ] eval 失败会在 CI 中暴露
- [ ] 每个 eval 都有输入、期望工具调用、期望回答
- [ ] 能说明 AI Testing 和普通 e2e 测试的区别

### 9.5 AI Monitoring

- [ ] 功能：记录每次 AI 请求的 token 使用和耗时
      能力：成本监控、性能分析、LLM 调用元数据
- [ ] 功能：记录工具调用次数、失败率、平均耗时
      能力：Tool metrics、瓶颈定位、告警
- [ ] 功能：AI 失败按 provider_error、tool_error、policy_denied 分类
      能力：错误分级、排障路径、用户提示
- [ ] 功能：AI 响应关联 appVersion、operatorId、tenantId
      能力：版本回归、租户问题定位、审计追踪

验收：

- [ ] 能看到 Agent 平均耗时和工具失败率
- [ ] provider 超时和权限拒绝能区分
- [ ] 某版本 AI 失败率升高能定位 commit
- [ ] 能回答 AI Monitoring 与传统接口 metrics 的差异

---

## 10. 测试策略与真实问题表征

这个项目的测试目标不是覆盖率数字，而是把真实线上风险变成可复现、可防回归的用例。

### 10.1 BFF 集成与 e2e

- [ ] 功能：登录、会话、权限、数据权限走真实 Nest TestingModule
      能力：TestingModule、Supertest、cookie、Guard
- [ ] 功能：MongoDB 和 Redis 使用测试隔离库
      能力：测试环境隔离、fixture、幂等初始化
- [ ] 功能：覆盖 400 / 401 / 403 / 404 / 409 / 500
      能力：失败路径、统一错误结构、异常过滤
- [ ] 功能：覆盖跨租户、跨部门、伪造 operator、伪造 tenantId
      能力：安全回归测试、攻击用例、权限边界

验收：

- [ ] `pnpm test:bff` 通过
- [ ] 改 Guard / Filter / Interceptor 不会破坏主链路
- [ ] 安全边界失败会导致测试失败
- [ ] 能说明为什么这些测试比纯页面测试更关键

### 10.2 Playwright 核心链路

- [ ] 功能：保留最小 UI e2e：登录后访问商品列表
      能力：真实浏览器、cookie 会话、页面入口验证
- [ ] 功能：保留最小 UI e2e：operator 改状态，admin 查审计
      能力：多角色、跨账号验证、真实链路
- [ ] 功能：保留最小 UI e2e：AI 排障任务创建并展示结果
      能力：端到端 Agent 入口、异步任务、可见结果
- [ ] 功能：Playwright 失败保留 screenshot、video、trace
      能力：测试排障、CI artifact、失败复现

验收：

- [ ] UI e2e 不追求复杂页面覆盖，只验证关键系统链路
- [ ] 测试数据可重复初始化
- [ ] CI 中能跑无头浏览器测试
- [ ] 失败后能通过 trace 定位卡在哪一步

### 10.3 文档案例库

- [ ] 功能：新增案例：状态已变但列表没变
      能力：缓存排障、DB 校验、traceId、header
- [ ] 功能：新增案例：第一页快，深页慢
      能力：offset 分页、索引、cursor 分页
- [ ] 功能：新增案例：某租户很慢，其他租户正常
      能力：热点租户、分片、tenantId、queryPlan
- [ ] 功能：新增案例：AI 给出错误排障结论
      能力：来源引用、eval、日志不足、幻觉控制

验收：

- [ ] 每个案例都有输入数据、系统状态、排查步骤、最终结论
- [ ] 每个专有名词都结合案例解释
- [ ] 每个案例都能映射一个面试追问
- [ ] 能从案例反推需要哪些日志、metrics、trace 字段

---

## 11. 面试能力映射

这一章不是 todo 的替代品，只用于检查项目是否覆盖目标岗位要求。

| 面试能力     | 对应系统模块                                | 可被追问的深度                   |
| ------------ | ------------------------------------------- | -------------------------------- |
| React / Next | App Router、Server/Client 边界、错误上报    | SSR、cookie 转发、环境变量边界   |
| Node BFF     | TenantContext、API Client、防腐层、幂等     | 可信入口、服务聚合、下游故障隔离 |
| 工程化       | monorepo、CI、build、Docker、release        | 质量门禁、构建产物、回滚         |
| 稳定性       | logs、metrics、trace、health、draining      | 线上排障、告警、滚动发布         |
| 权限安全     | RBAC、数据权限、多租户、审批、审计          | 越权防护、可信身份、高风险治理   |
| 数据规模     | Redis、索引、cursor、queryPlan、分片        | 深分页、热点租户、缓存一致性     |
| AI 工程化    | Agent task、Tool Registry、eval、monitoring | Tool Calling、权限过滤、AI 安全  |
| 全栈系统设计 | client / BFF / backend / DB / AI service    | 边界划分、故障恢复、演进路线     |

最终项目介绍应该落到这句话：

```text
我用一个 AI 运营治理平台模拟真实内部系统复杂度。它不是只做商品 CRUD，
而是从 Next.js 前端入口出发，打通 Node BFF、RBAC、多租户数据权限、
审计、高风险审批、Redis 缓存、MongoDB 查询规模、CI 质量门禁、日志指标链路追踪、
发布回滚，以及基于系统工具调用的 AI Agent。
```
