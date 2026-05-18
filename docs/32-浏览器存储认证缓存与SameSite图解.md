# 浏览器认证、缓存、SameSite 与 OAuth 图解

正文只保留边界结论；细节放在 Mermaid 图里。

## 速答

| 问题 | 最短答案 | 看图 |
| --- | --- | --- |
| Session Cookie 是否跨 tab | 是。Cookie 属于浏览器 Cookie Jar，不属于某个 tab。 | 图 1 |
| 关闭相关 tab 是否清 Session Cookie | 不可靠。关闭本站 tab 通常不清；关闭浏览器会话才可能清，且会话恢复可能保留。 | 图 1 / 图 2 |
| sessionStorage 是否跨 tab | 否。它属于 `origin + 当前顶层 tab`。复制 tab 可能拷贝初始值，之后独立。 | 图 1 |
| access token 放内存是哪里 | JS 变量、React state/context、内存 store、api client 闭包。 | 图 1 / 图 2 |
| 多 tab 共享 WebSocket | 让 `SharedWorker` 或 leader tab 持有唯一 socket，其他 tab 走消息通道。 | 图 3 |
| HTTP Cache / Cache Storage CRUD | HTTP Cache 由协议头自动管；Cache Storage 由 JS/Service Worker 显式管。 | 图 4 |
| 二者是否都是 Request -> Response 仓库 | 抽象上是；区别是协议缓存 vs 应用缓存。 | 图 4 |
| Cookie 未过期但 Redis 过期 | 下一次请求返回 `401`，并用 `Set-Cookie: Max-Age=0` 清浏览器 Cookie。 | 图 2 |
| SameSite=Lax 顶级 GET 导航 | 外站点击链接后，整个 tab 跳到本站主文档 GET，会带 Lax Cookie。 | 图 5 |
| OAuth 第一性原理 | 用户授权客户端访问有限资源，不把主账号密码交给客户端。 | 图 6 |

## 图 1：浏览器存储边界

```mermaid
flowchart LR
  Profile[Browser Profile] --> CookieJar[Cookie Jar<br/>Domain / Path / SameSite<br/>同站 tab 共享]

  CookieJar --> TabA[Tab A<br/>admin.example.com]
  CookieJar --> TabB[Tab B<br/>admin.example.com]
  CookieJar -. 站点不匹配 .-> TabC[Tab C<br/>other.example]

  TabA --> HeapA[JS heap A<br/>access token 内存变量<br/>刷新/关闭即丢]
  TabA --> SSA[sessionStorage A<br/>只属于 Tab A]
  TabB --> HeapB[JS heap B<br/>另一份内存]
  TabB --> SSB[sessionStorage B<br/>只属于 Tab B]

  TabA --> Local[localStorage / IndexedDB<br/>同源持久<br/>JS 可读写]
  TabB --> Local

  CookieJar --> Redis[(Redis Session<br/>sid -> userId / roles<br/>TTL 决定服务端有效性)]
  Close[关闭本站 tab] -. 通常不是删除 Cookie .-> CookieJar
```

## 图 2：access token、refresh token、Redis TTL 与清 Cookie

```mermaid
flowchart LR
  Login[登录成功<br/>BFF 校验账号] --> Access[Access Token<br/>放 JS 内存<br/>短 TTL]
  Login --> Refresh[Refresh Token<br/>HttpOnly Cookie<br/>JS 读不到]
  Login --> Redis[(Redis<br/>refreshId/sessionId -> userId<br/>可撤销 + TTL)]

  Access --> Api[业务 API<br/>Authorization: Bearer access]
  Api --> Expired[access 过期<br/>返回 401/419]
  Expired --> RefreshReq[POST /auth/refresh<br/>浏览器自动带 refresh cookie]
  Refresh --> RefreshReq
  RefreshReq --> Check{Redis 记录是否存在?}

  Check -->|存在| NewAccess[返回新 access<br/>仍只进内存]
  Check -->|不存在 / TTL 到期| Clear[401 + Set-Cookie<br/>Max-Age=0]
  Clear --> BrowserClear[浏览器收到响应<br/>删除匹配 Name/Path/Domain 的 Cookie]
```

## 图 3：多 tab 共享 WebSocket

```mermaid
flowchart LR
  A[Tab A] --> SWK[SharedWorker<br/>唯一 socket owner<br/>维护订阅表]
  B[Tab B] --> SWK
  C[Tab C] --> SWK
  SWK --> WS[一条 WebSocket<br/>所有 tab 复用]
  WS --> Server[Realtime Gateway<br/>鉴权 / 心跳 / 推送]

  A -. 候选 .-> Leader[Leader Tab<br/>无 SharedWorker 时]
  B -. 候选 .-> Leader
  Leader --> Lock[Web Locks / lease<br/>选主 + 续租 + 故障切换]
  Leader --> Server
  Server --> BC[BroadcastChannel<br/>跨 tab 分发消息]
  BC --> A
  BC --> B
  BC --> C

  ServiceWorker[Service Worker] -. 不适合长期持有 WS<br/>生命周期会被浏览器终止 .-> Server
```

## 图 4：Service Worker、HTTP Cache、Cache Storage CRUD

```mermaid
flowchart LR
  Page[Page<br/>fetch / img / import] --> Scope{是否被 SW scope 控制?}

  Scope -->|是| SW[Service Worker<br/>可编程网络代理<br/>fetch event]
  Scope -->|否| HTTPCache[HTTP Cache<br/>协议层 Request -> Response<br/>浏览器自动决策]

  SW --> CacheStorage[Cache Storage<br/>应用层 Request -> Response<br/>JS 可枚举]
  SW --> Network[Network<br/>BFF / CDN / API]
  HTTPCache --> Network
  Network --> Headers[响应头<br/>Cache-Control / ETag / Vary]
  Headers --> HTTPCache

  CacheStorage --> C[Create<br/>cache.add / cache.put]
  CacheStorage --> R[Read<br/>cache.match]
  CacheStorage --> U[Update<br/>put 覆盖旧 Response]
  CacheStorage --> D[Delete<br/>cache.delete / caches.delete]

  HTTPCache --> Auto[自动读写淘汰<br/>fresh / stale / revalidate<br/>存储压力 / Clear-Site-Data]
```

## 图 5：SameSite=Lax 顶级 GET 导航

```mermaid
flowchart LR
  Other[外站 news.example<br/>当前 tab 主文档] --> Link[用户点击链接<br/>href=https://admin.example.com]
  Link --> Top[顶级导航<br/>整个 tab 地址栏变成本站<br/>不是 iframe/img]
  Top --> Get[GET /dashboard<br/>安全方法<br/>主文档请求]
  Get --> Send[SameSite=Lax Cookie<br/>允许发送]

  Other -. 页面自动加载 .-> Img[img/script 子资源 GET]
  Other -. 嵌入本站 .-> Iframe[iframe]
  Other -. 跨站写操作 .-> Post[form POST]

  Img --> Blocked[Lax 不发送]
  Iframe --> Blocked
  Post --> Blocked
```

## 图 6：OAuth Authorization Code + PKCE 泳道图

```mermaid
sequenceDiagram
  autonumber
  actor User as 用户
  participant Browser as 浏览器 / Next.js Admin
  participant BFF as NestJS BFF<br/>OAuth Client
  participant IdP as 授权服务器 / IdP
  participant RS as 资源服务器<br/>UserInfo API
  participant Local as 本系统账号 / Session
  participant API as 业务 API

  User->>Browser: 点击 GitHub / SSO 登录
  Browser->>BFF: GET /oauth/start
  BFF->>BFF: 生成 state + PKCE<br/>state 防 CSRF/串号<br/>verifier 只存在 BFF
  BFF-->>Browser: 302 跳转 IdP<br/>client_id / scope / state / code_challenge
  Browser->>IdP: 打开授权页
  User->>IdP: 在 IdP 输入密码并确认授权<br/>密码不进入 Admin/BFF
  IdP-->>Browser: 302 /callback?code&state<br/>code 一次性、短 TTL
  Browser->>BFF: GET /oauth/callback?code&state
  BFF->>BFF: 校验 state<br/>防伪造回调和串号
  BFF->>IdP: 后端换 token<br/>code + code_verifier
  IdP-->>BFF: access token / id token
  BFF->>RS: Bearer token 拉 userinfo
  RS-->>BFF: sub / email / org
  BFF->>Local: 映射或创建本地用户<br/>roles / tenant / enabled
  Local-->>BFF: 本地 AuthUser
  BFF-->>Browser: Set-Cookie app_session=... HttpOnly
  Browser->>API: 后续业务请求自动带本地 Cookie
  API->>BFF: 按本系统 Redis/Mongo/RBAC 鉴权
```

核心流程：浏览器只负责跳转，BFF 负责校验、换 token 和落本地登录态。

1. 用户点击 SSO 登录后，BFF 生成 `state` 和 PKCE 参数，再把浏览器重定向到 IdP。
2. 用户只在 IdP 输入密码；IdP 登录成功后，把一次性 `code` 和原 `state` 带回 BFF。
3. BFF 校验 `state`，再用服务端保存的 `code_verifier` 去 IdP 换 token。
4. BFF 用 token 拉 `userinfo`，映射成本系统用户、租户和角色。
5. BFF 最终写入 `HttpOnly app_session`；后续业务接口只按本系统 Cookie、Redis Session 和 RBAC 鉴权。

## 必要边界

| 边界 | 结论 |
| --- | --- |
| Cookie vs Session | Cookie 是浏览器存储和自动发送机制；Session 是服务端登录态记录。 |
| Token vs 本地登录态 | 第三方 OAuth token 不应直接等同于当前系统登录态；BFF 应创建自己的 session。 |
| 缓存清理 | HTTP Cache 不能像普通 Map 一样被业务 JS 枚举 CRUD；Cache Storage 可以。 |
