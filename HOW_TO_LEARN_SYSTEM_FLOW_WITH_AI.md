# F1002 Scenario Documentation Checklist

目标：以后每新增一个场景，都按这份 checklist 生成文档。  
重点不是背 API，而是把场景的数据流、系统边界、状态变化、规则兜底梳理清楚。  

---

## 1. 每个场景文档必须回答的 8 个问题

- [ ] 这个场景的目标是什么
- [ ] 这个场景的输入数据是什么
- [ ] 这个场景的输出数据是什么
- [ ] 数据经过了哪些层
- [ ] 每一层负责什么，不负责什么
- [ ] 这个场景有哪些状态变化
- [ ] 哪些规则必须由后端兜底
- [ ] 这里实际用到了哪些 NestJS 能力，它们各自解决什么问题

如果这 8 个问题答不完整，这个场景就还没真正梳理清楚。

---

## 2. 每个场景文档必须包含的 4 张图

### 2.1 请求流转图

必须有。

用途：看清一次请求从页面到 BFF 再到 backend 的完整路径。

模板：

```text
Page / User Action
  ↓
HTTP Request
  ↓
apps/bff Controller
  ↓
apps/bff Service / Guard / Pipe
  ↓
apps/server Controller
  ↓
apps/server Service
  ↓
Database / External Service
  ↓
HTTP Response
  ↓
Page Update
```

### 2.2 系统分层图

必须有。

用途：看清这个场景里 client、bff、server、database 各自负责什么。

模板：

```text
client
  负责：
  不负责：

bff
  负责：
  不负责：

server
  负责：
  不负责：

database
  负责：
  不负责：
```

### 2.3 数据结构图

必须有。

用途：看清不同层的数据结构有没有混掉。

模板：

```text
Page State
  ↓
Request DTO
  ↓
Service Internal Data
  ↓
Persistence Schema
  ↓
Response DTO / Response Shape
```

### 2.4 状态变化图

只要场景里有状态变化，就必须有。

用途：看清哪些状态能变，哪些不能变。

模板：

```text
state_a
  ↓ action_1
state_b
  ↓ action_2
state_c

invalid:
state_c -> state_a
```

---

## 3. 每个场景文档的固定结构

后续新文档统一按这个顺序写。

### 3.1 场景目标

- [ ] 用户在做什么
- [ ] 系统要完成什么

### 3.2 输入

- [ ] 页面输入数据
- [ ] HTTP 请求结构
- [ ] DTO 结构

### 3.3 输出

- [ ] 成功响应结构
- [ ] 失败响应结构
- [ ] 页面最终状态变化

### 3.4 请求链路

- [ ] 页面到 BFF
- [ ] BFF 到 backend
- [ ] backend 到数据库
- [ ] 响应回到页面

### 3.5 分层职责

- [ ] client 做什么
- [ ] bff 做什么
- [ ] server 做什么
- [ ] database 做什么

### 3.6 数据结构

- [ ] 页面状态结构
- [ ] DTO 结构
- [ ] 业务流转结构
- [ ] 持久化结构
- [ ] 响应结构

### 3.7 状态变化

- [ ] 初始状态
- [ ] 成功状态
- [ ] 失败状态
- [ ] 非法状态变化

### 3.8 规则兜底

- [ ] 参数校验在哪层
- [ ] 权限校验在哪层
- [ ] 业务规则在哪层
- [ ] 错误处理在哪层
- [ ] 审计记录在哪层

### 3.9 NestJS 能力映射

- [ ] Controller 解决什么问题
- [ ] DTO / Pipe 解决什么问题
- [ ] Guard 解决什么问题
- [ ] Service 解决什么问题
- [ ] Interceptor / Filter 解决什么问题
- [ ] Provider / Module 解决什么问题

---

## 4. 你在写场景文档时，优先看的不是 API，而是这 5 个核心面

- [ ] 数据流
- [ ] 分层边界
- [ ] 数据结构
- [ ] 状态变化
- [ ] 规则兜底

如果这 5 个面写清楚了，NestJS 的 API 细节可以随时查；如果这 5 个面没写清楚，代码再多也只是“能跑”，不是“掌握”。

---

## 5. 场景文档的最小模板

以后新增文档，最少包含下面这些块：

```md
# Fxxxx Scene Name

## 1. 场景目标

## 2. 请求流转图

## 3. 系统分层图

## 4. 输入 / 输出

## 5. 数据结构图

## 6. 状态变化图

## 7. 规则兜底

## 8. NestJS 能力映射
```

---

## 6. 登录场景最小示例

```text
LoginPage
  ↓ POST /api/auth/login
AuthController
  ↓
LoginDto + ValidationPipe
  ↓
AuthService
  ↓
SessionStoreService
  ↓
Set-Cookie
  ↓
Browser 保存会话
```

这个场景至少要写清楚：

- [ ] 输入：`username`、`password`
- [ ] 输出：成功 user 信息，失败错误结构
- [ ] 分层：页面收集输入，BFF 处理 session，server 未来处理真实认证
- [ ] 状态：未登录 -> 已登录 -> 退出后未登录
- [ ] 规则：参数校验、账号密码校验、错误处理
- [ ] NestJS：Controller、DTO、ValidationPipe、Service、Provider、ExceptionFilter

---

## 7. 后续规范

从现在开始，所有新增场景文档都要遵守这份规范：

- [ ] 有固定结构
- [ ] 有请求流转图
- [ ] 有系统分层图
- [ ] 有数据结构图
- [ ] 有状态变化图
- [ ] 不只写 API 名字，要写“这个能力解决什么问题”

---

## 8. 一句话总结

以后你不是在“记场景用了哪些 NestJS API”，而是在“按统一模板拆清一个场景的数据、边界、状态、规则，再把 NestJS 能力映射上去”。
