# Stage 1: NestJS 线上系统功能迭代 Todo

目标：基于当前 `next-bff` 系统迭代真实后台功能。每个 todo 都把“系统功能”和“需要使用的 NestJS 能力”写在一起，用功能推动你掌握 NestJS 设计。

当前系统：

```text
apps/client  -> Next.js 管理后台页面
apps/bff     -> NestJS BFF，负责登录、会话、聚合、协议转换
apps/server  -> NestJS backend，目前偏 mock backend
```

读法：

- `功能` 是你要交付的系统行为
- `NestJS` 是这个行为要用到的框架能力
- `验收` 是做完以后怎么确认

---

## 1. 登录、会话、当前用户

### 1.1 用户在登录页输入账号密码并提交

- [x] 功能：前端提交 username / password 到 BFF `/api/auth/login`
      NestJS：`AuthController` 暴露登录接口，`@Body()` 接收 `LoginDto`
- [x] 功能：BFF 校验 username / password 必填且格式合法
      NestJS：`LoginDto` + `ValidationPipe` + `class-validator`
- [x] 功能：BFF 校验账号密码是否正确
      NestJS：`AuthService` 承担认证逻辑，Controller 不写业务判断
- [x] 功能：登录成功后创建 session
      NestJS：`SessionStoreService` 作为 Provider 管理 session 状态
- [x] 功能：登录成功后写入 httpOnly cookie
      NestJS：`AuthController` 只处理 HTTP cookie 适配，核心逻辑在 Service
- [x] 功能：登录失败返回统一错误
      NestJS：`UnauthorizedException` + 全局 `ExceptionFilter`

验收：

- [x] 正确账号能登录并写入 cookie
- [x] 错误账号返回统一 401
- [x] 登录 Controller 不直接写账号校验细节

### 1.2 用户刷新页面后系统能识别当前用户

- [ ] 功能：前端请求 BFF `/api/auth/me`
      NestJS：`AuthController` 暴露当前用户接口
- [ ] 功能：未登录用户访问 `/api/auth/me` 被拒绝
      NestJS：`AuthGuard` 判断 session 是否有效
- [ ] 功能：已登录用户返回 id、username、roles
      NestJS：`@CurrentUser()` 自定义参数装饰器读取当前用户
- [ ] 功能：多个受保护接口复用同一套登录判断
      NestJS：`Guard` 绑定到 Controller 或 handler
- [ ] 功能：Controller 不直接解析 cookie
      NestJS：用户解析逻辑放到 Provider / Guard

验收：

- [ ] 未登录访问 `/api/auth/me` 返回统一 401
- [ ] 已登录访问能拿到当前用户
- [ ] 商品相关 BFF 接口可以复用登录 Guard

### 1.3 用户退出登录

- [ ] 功能：前端调用 BFF `/api/auth/logout`
      NestJS：`AuthController` 暴露退出接口
- [ ] 功能：BFF 删除 session
      NestJS：`AuthService` 调用 `SessionStoreService` 销毁会话
- [ ] 功能：BFF 清理 cookie
      NestJS：Controller 处理 HTTP cookie 适配
- [ ] 功能：退出成功返回统一结构
      NestJS：成功响应 `Interceptor`

验收：

- [ ] 退出后访问商品列表接口返回 401
- [ ] 退出接口响应结构和其他接口一致

---

## 2. 用户、角色、权限

### 2.1 系统支持 admin / operator / viewer 三类用户

- [ ] 功能：系统能维护用户基础信息
      NestJS：`UserModule` + `UserController` + `UserService`
- [ ] 功能：系统能维护角色基础信息
      NestJS：`RoleModule` + `RoleService`
- [ ] 功能：系统能维护权限点
      NestJS：`PermissionModule` + `PermissionService`
- [ ] 功能：用户能绑定一个或多个角色
      NestJS：Service 组合用户和角色查询逻辑
- [ ] 功能：角色能绑定商品读取、创建、更新、删除等权限
      NestJS：模块通过 `imports` / `exports` 暴露权限查询能力

验收：

- [ ] admin / operator / viewer 权限不同
- [ ] 用户、角色、权限没有混在商品模块里

### 2.2 viewer 只能查看商品，不能创建商品

- [ ] 功能：商品创建接口声明需要 `commodity:create`
      NestJS：`@RequirePermissions("commodity:create")` 写入 metadata
- [ ] 功能：请求进入创建接口前先检查权限
      NestJS：`PermissionGuard` + `Reflector` 读取 metadata
- [ ] 功能：viewer 创建商品返回 403
      NestJS：`ForbiddenException` + 全局 `ExceptionFilter`
- [ ] 功能：operator / admin 可以创建商品
      NestJS：Guard 调用 `PermissionService` 判断权限

验收：

- [ ] viewer 创建商品失败
- [ ] operator / admin 创建商品成功
- [ ] 商品创建 Service 不读取 decorator metadata

### 2.3 只有 admin 可以删除商品

- [ ] 功能：商品删除接口声明需要 `commodity:delete`
      NestJS：权限 decorator + metadata
- [ ] 功能：删除前统一做权限判断
      NestJS：`PermissionGuard`
- [ ] 功能：operator / viewer 删除商品返回 403
      NestJS：`ForbiddenException`
- [ ] 功能：admin 删除商品后记录审计日志
      NestJS：`AuditLogService` 由商品 Service 调用

验收：

- [ ] 删除接口只有 admin 可用
- [ ] 权限失败和成功响应都稳定

---

## 3. 商品创建、查询、详情

### 3.1 用户创建商品

- [ ] 功能：创建商品需要 name、price、stock、status、description
      NestJS：`CreateCommodityDto`
- [ ] 功能：price 必须大于 0
      NestJS：DTO 校验 + `ValidationPipe`
- [ ] 功能：stock 必须是非负整数
      NestJS：DTO 校验 + `ValidationPipe`
- [ ] 功能：status 只能是 `pending`、`on_sale`、`offline`
      NestJS：DTO enum 校验
- [ ] 功能：创建商品需要登录
      NestJS：`AuthGuard`
- [ ] 功能：创建商品需要权限
      NestJS：`PermissionGuard` + `@RequirePermissions`
- [ ] 功能：创建成功记录创建人
      NestJS：`@CurrentUser()` 注入当前用户，Service 写入 `createdBy`
- [ ] 功能：创建成功返回商品详情
      NestJS：`CommodityService` 返回业务数据，响应 `Interceptor` 统一包装

验收：

- [ ] 非法 price / stock / status 返回 400
- [ ] 未登录返回 401
- [ ] 无权限返回 403
- [ ] 创建结果包含商品 id 和 createdBy

### 3.2 用户查看商品列表

- [ ] 功能：支持关键词搜索
      NestJS：`QueryCommodityListDto` + Service 查询条件组装
- [ ] 功能：支持状态筛选
      NestJS：DTO enum 校验 + Mongoose query
- [ ] 功能：支持价格区间
      NestJS：DTO transform + Service query composition
- [ ] 功能：支持库存区间
      NestJS：DTO transform + Service query composition
- [ ] 功能：支持创建时间区间
      NestJS：DTO 日期校验 + Mongoose query
- [ ] 功能：支持分页
      NestJS：DTO 限制 page / pageSize，Service 计算 pagination
- [ ] 功能：支持排序字段白名单
      NestJS：DTO enum 限制 sortBy / sortOrder
- [ ] 功能：BFF 不直接暴露 backend 内部查询字段
      NestJS：BFF `CommodityService` 做协议适配

验收：

- [ ] 非法分页参数返回 400
- [ ] 非法排序字段返回 400
- [ ] 列表返回 list 和 pagination
- [ ] BFF 和 backend 查询协议边界清楚

### 3.3 用户查看商品详情

- [ ] 功能：根据商品 id 查询详情
      NestJS：`@Param()` + id 校验 Pipe
- [ ] 功能：无效 id 返回 400
      NestJS：自定义 `ParseObjectIdPipe` 或等价 Pipe
- [ ] 功能：商品不存在返回 404
      NestJS：`NotFoundException`
- [ ] 功能：已软删除商品默认不可见
      NestJS：`CommodityService` 统一查询规则
- [ ] 功能：详情展示商品状态、库存、审计字段
      NestJS：Service 返回领域数据，Controller 不拼装业务规则

验收：

- [ ] 无效 id 返回 400
- [ ] 不存在 id 返回 404
- [ ] 已删除商品详情不可见

---

## 4. 商品状态流转与软删除

### 4.1 operator 审核通过商品

- [ ] 功能：pending 商品可以审核通过变为 on_sale
      NestJS：`CommodityService` 实现状态流转规则
- [ ] 功能：审核通过需要 `commodity:update` 权限
      NestJS：`PermissionGuard` + `@RequirePermissions`
- [ ] 功能：状态变更需要原因
      NestJS：`UpdateCommodityStatusDto` + `ValidationPipe`
- [ ] 功能：状态变更记录操作者
      NestJS：`@CurrentUser()` 注入操作者
- [ ] 功能：状态变更写审计日志
      NestJS：`AuditLogService`

验收：

- [ ] pending -> on_sale 成功
- [ ] 无权限返回 403
- [ ] 审计日志记录状态变化

### 4.2 用户下架商品

- [ ] 功能：on_sale 商品可以下架为 offline
      NestJS：Service business rules
- [ ] 功能：offline 不能直接变 on_sale
      NestJS：`BadRequestException`
- [ ] 功能：非法状态流转返回统一错误
      NestJS：全局 `ExceptionFilter`
- [ ] 功能：下架原因必填
      NestJS：DTO 校验

验收：

- [ ] on_sale -> offline 成功
- [ ] offline -> on_sale 失败
- [ ] Controller 不写状态判断逻辑

### 4.3 admin 删除商品

- [ ] 功能：删除商品不物理删除
      NestJS：`CommodityService` 执行软删除
- [ ] 功能：删除后列表不可见
      NestJS：Service 默认查询过滤 `deletedAt`
- [ ] 功能：删除后详情不可见
      NestJS：Service 统一查询规则 + `NotFoundException`
- [ ] 功能：删除记录 deletedBy / deletedAt
      NestJS：`@CurrentUser()` + Service 写入审计字段
- [ ] 功能：删除写审计日志
      NestJS：`AuditLogService`

验收：

- [ ] 数据库仍保留商品记录
- [ ] 普通列表查不到已删除商品
- [ ] 审计日志能查到删除操作

---

## 5. 上传与文件服务

### 5.1 用户上传商品图片

- [ ] 功能：商品图片只允许 jpg / png / webp
      NestJS：`FileInterceptor` + 文件校验 Pipe
- [ ] 功能：商品图片限制大小
      NestJS：Multer options / file validator
- [ ] 功能：上传成功返回 fileId、url、size、mimeType、scene
      NestJS：`UploadService` 返回文件元数据，Interceptor 统一包装
- [ ] 功能：上传失败返回统一错误
      NestJS：`BadRequestException` + Exception Filter
- [ ] 功能：上传需要登录和权限
      NestJS：`AuthGuard` + `PermissionGuard`

验收：

- [ ] 非图片上传返回 400
- [ ] 超过大小限制返回 400
- [ ] 成功结果不暴露存储实现细节

### 5.2 系统可以替换本地存储为 S3 / OSS

- [ ] 功能：当前使用本地 mock 存储
      NestJS：`LocalStorageService`
- [ ] 功能：未来可切换 S3 / OSS
      NestJS：custom provider token + `useClass`
- [ ] 功能：根据配置选择存储实现
      NestJS：`ConfigModule` + `useFactory`
- [ ] 功能：UploadService 不依赖具体存储类
      NestJS：DI 注入抽象 provider

验收：

- [ ] 替换存储实现不需要改 UploadController
- [ ] 可以解释 provider token 解决了什么问题

---

## 6. 统一响应、错误、日志

### 6.1 所有错误响应统一

- [ ] 功能：参数错误统一返回 400 结构
      NestJS：`ValidationPipe` + Exception Filter
- [ ] 功能：未登录统一返回 401 结构
      NestJS：`UnauthorizedException` + Exception Filter
- [ ] 功能：无权限统一返回 403 结构
      NestJS：`ForbiddenException` + Exception Filter
- [ ] 功能：资源不存在统一返回 404 结构
      NestJS：`NotFoundException` + Exception Filter
- [ ] 功能：系统错误统一返回 500 结构
      NestJS：全局 Exception Filter
- [ ] 功能：错误响应包含 requestId
      NestJS：request context + Exception Filter

验收：

- [ ] 400 / 401 / 403 / 404 / 500 响应结构一致
- [ ] 前端能稳定读取 message 和 requestId

### 6.2 所有成功响应统一

- [ ] 功能：所有成功接口返回 success / data / message / requestId
      NestJS：全局 response Interceptor
- [ ] 功能：Controller 直接返回业务数据
      NestJS：Interceptor 统一包装
- [ ] 功能：文件流等特殊场景可以跳过包装
      NestJS：skip metadata decorator + Reflector

验收：

- [ ] Controller 不再手写 `{ success: true }`
- [ ] API 最终响应结构统一

### 6.3 一次请求可以被完整追踪

- [ ] 功能：请求进入 BFF 时生成 requestId
      NestJS：Middleware
- [ ] 功能：BFF 调 backend 时透传 requestId
      NestJS：BFF API client Provider
- [ ] 功能：backend 日志打印 requestId
      NestJS：Middleware / Logger
- [ ] 功能：接口耗时被记录
      NestJS：Interceptor
- [ ] 功能：错误日志包含 requestId
      NestJS：Exception Filter + Logger

验收：

- [ ] 一次商品创建能在 BFF 和 backend 日志中用同一个 requestId 串起来
- [ ] 慢接口能看到耗时

---

## 7. Mongoose 持久化

### 7.1 商品数据持久化

- [ ] 功能：商品创建后重启服务数据不丢
      NestJS：`DatabaseModule` + `MongooseModule.forRootAsync`
- [ ] 功能：商品模块注册商品模型
      NestJS：`MongooseModule.forFeature`
- [ ] 功能：商品创建写入 MongoDB
      NestJS：Model injection + `CommodityService`
- [ ] 功能：商品列表从 MongoDB 查询
      NestJS：Mongoose query + Service query composition
- [ ] 功能：商品软删除写入 MongoDB
      NestJS：Mongoose update + Service business rules

验收：

- [ ] mock store 被替换为 MongoDB
- [ ] 重启服务后数据仍存在
- [ ] Controller 不直接注入 Mongoose Model

### 7.2 用户、角色、权限持久化

- [ ] 功能：用户数据保存到 MongoDB
      NestJS：`UserModule` + user schema
- [ ] 功能：角色数据保存到 MongoDB
      NestJS：`RoleModule` + role schema
- [ ] 功能：权限数据保存到 MongoDB
      NestJS：`PermissionModule` + permission schema
- [ ] 功能：登录和鉴权读取真实用户角色
      NestJS：Guard + Service + Mongoose model
- [ ] 功能：初始化测试账号
      NestJS：seed service / bootstrap script

验收：

- [ ] 权限判断基于持久化数据
- [ ] 测试账号可重复初始化

### 7.3 商品查询性能设计

- [ ] 功能：按状态筛选稳定
      NestJS：Mongoose schema index
- [ ] 功能：按创建时间排序稳定
      NestJS：Mongoose schema index
- [ ] 功能：状态 + 创建时间组合查询稳定
      NestJS：Mongoose compound index
- [ ] 功能：pageSize 有最大值
      NestJS：DTO 校验
- [ ] 功能：记录 offset 分页局限
      NestJS：Service 层保留未来 cursor 分页扩展点

验收：

- [ ] 能解释每个索引为什么存在
- [ ] 能解释什么时候要升级 cursor 分页

---

## 8. 审计日志

### 8.1 商品写操作记录审计日志

- [ ] 功能：创建商品写审计日志
      NestJS：`AuditLogService`
- [ ] 功能：更新商品写审计日志
      NestJS：Service composition
- [ ] 功能：上下架商品写审计日志
      NestJS：`CommodityService` 调用 `AuditLogService`
- [ ] 功能：删除商品写审计日志
      NestJS：`@CurrentUser()` + requestId context
- [ ] 功能：审计日志记录 operator、action、target、requestId、createdAt
      NestJS：AuditLog schema + Service

验收：

- [ ] 任意商品写操作都能追踪是谁、何时、对什么做了什么
- [ ] 审计逻辑不散落在 Controller

### 8.2 管理员查看审计日志

- [ ] 功能：admin 可以查看审计日志
      NestJS：`PermissionGuard`
- [ ] 功能：按操作人筛选
      NestJS：Query DTO + Mongoose query
- [ ] 功能：按操作类型筛选
      NestJS：DTO enum 校验
- [ ] 功能：按时间筛选
      NestJS：DTO transform + Mongoose query
- [ ] 功能：分页查看
      NestJS：DTO page / pageSize 校验

验收：

- [ ] 只有 admin 可以查看审计日志
- [ ] 查询参数都有校验

---

## 9. API 文档与测试

### 9.1 核心接口有 Swagger 文档

- [ ] 功能：登录接口有文档
      NestJS：`ApiTags` + `ApiOperation` + DTO `ApiProperty`
- [ ] 功能：商品创建、列表、详情、状态变更、删除有文档
      NestJS：Swagger decorators
- [ ] 功能：上传接口有文档
      NestJS：multipart Swagger 配置
- [ ] 功能：权限错误响应有文档
      NestJS：`ApiResponse`
- [ ] 功能：审计日志接口有文档
      NestJS：Query DTO docs

验收：

- [ ] Swagger 能打开并覆盖核心接口
- [ ] DTO 字段说明完整

### 9.2 核心链路有自动化测试

- [ ] 功能：登录成功链路有测试
      NestJS：`TestingModule` + Supertest
- [ ] 功能：未登录访问商品接口有测试
      NestJS：e2e app bootstrap + Guard 验证
- [ ] 功能：无权限创建商品有测试
      NestJS：mock user / permission provider
- [ ] 功能：创建商品成功有测试
      NestJS：Service mock 或测试数据库
- [ ] 功能：非法商品参数有测试
      NestJS：ValidationPipe e2e
- [ ] 功能：商品软删除有测试
      NestJS：Service test + e2e test

验收：

- [ ] 核心成功路径和失败路径都有测试
- [ ] 改 Guard / Filter / Interceptor 不容易破坏主链路

---

## 10. 最终验收

### 10.1 用户链路验收

- [ ] 用户登录 -> 进入商品列表
- [ ] 用户创建商品 -> 跳转商品详情
- [ ] 用户筛选商品 -> 列表分页展示
- [ ] operator 修改商品状态 -> 审计日志可查
- [ ] viewer 创建商品 -> 被拒绝
- [ ] admin 删除商品 -> 列表不可见
- [ ] 用户上传商品图片 -> 返回文件元数据

### 10.2 NestJS 能力验收

- [ ] 每个用户链路都能对应到具体 NestJS 能力
- [ ] Controller 保持薄
- [ ] Service 承担业务规则
- [ ] DTO + Pipe 治理参数
- [ ] Guard 做认证授权
- [ ] Decorator + Metadata 表达权限需求
- [ ] Interceptor 做统一响应和耗时统计
- [ ] Filter 做统一异常
- [ ] Middleware 做 requestId 和入口日志
- [ ] ConfigModule 管理配置
- [ ] MongooseModule 接入持久化
- [ ] TestingModule 覆盖核心行为

### 10.3 面试表达验收

- [ ] 能讲清楚 BFF 和 backend 为什么分层
- [ ] 能讲清楚登录链路为什么这样设计
- [ ] 能讲清楚权限为什么用 Guard + decorator
- [ ] 能讲清楚商品状态流转为什么放 Service
- [ ] 能讲清楚统一响应为什么用 Interceptor
- [ ] 能讲清楚统一异常为什么用 Filter
- [ ] 能讲清楚 DTO、Schema、业务规则为什么不能混在一起
- [ ] 能讲清楚当前系统距离真正生产级还差哪些能力

---

## 暂时不做

- [ ] 暂时不上 AWS
- [ ] 暂时不拆微服务
- [ ] 暂时不做 CQRS / Event Sourcing
- [ ] 暂时不做复杂 DevOps
- [ ] 暂时不深挖 MongoDB 分片
- [ ] 暂时不做复杂缓存体系
