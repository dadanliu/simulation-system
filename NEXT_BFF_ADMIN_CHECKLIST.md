# Next.js + NestJS BFF MVP 功能清单

这份文档只记录一件事：

```text
这个项目最终需要完成哪些功能点。
```

---

## 1. 项目基础

- [x] 初始化 `Next.js App Router` 项目
- [x] 配置基础目录结构
- [x] 建立 `README.md`
- [x] 建立 `ARCHITECTURE.md`
- [x] 可以本地启动和访问

---

## 2. 路由与页面骨架

- [x] 实现 `/`
- [x] `/` 重定向到 `/present/commodity/list`
- [x] 实现 `/login`
- [x] 实现 `/present/layout.tsx`
- [x] 实现 `/present/commodity/list`
- [x] 实现 `/present/commodity/[id]`
- [x] 实现 `/present/commodity/create`
- [x] 页面壳包含导航区和顶部信息区
- [x] 修复菜单切换后激活状态不更新问题

---

## 3. 登录与会话

- [x] 实现 `POST /api/auth/login`
- [x] 实现 `POST /api/auth/logout`
- [x] 实现 `GET /api/auth/me`
- [x] 登录成功后写入 cookie
- [x] 登出后清除 cookie
- [x] 实现 `get-current-user`
- [x] 实现 `require-login`

---

## 4. Middleware

- [x] 新增 `apps/client/middleware.ts`
- [x] 未登录访问 `/present/**` 时跳转 `/login`
- [x] 未登录访问客户端受保护接口时跳转或拦截
- [x] 登录后允许访问受保护页面

---

## 5. BFF 基础设施

- [x] 将 `apps/bff` 改为 NestJS 项目
- [x] 建立 `apps/bff/src/main.ts`
- [x] 建立 `apps/bff/src/app.module.ts`
- [x] 建立 `apps/bff/src/auth/auth.module.ts`
- [x] 建立 `apps/bff/src/auth/auth.controller.ts`
- [x] 建立 `apps/bff/src/auth/auth.service.ts`
- [x] 建立 `apps/bff/src/auth/session-store.service.ts`
- [x] 建立 `apps/bff/src/bff/api-client.service.ts`
- [x] 建立 `apps/bff/src/bff/request-headers.service.ts`
- [x] 建立 `apps/bff/src/bff/response-handler.service.ts`
- [x] 建立 `apps/bff/src/bff/errors.ts`
- [x] BFF 统一注入 `userId`
- [x] BFF 统一注入 `traceId`
- [x] BFF 统一解包后端响应
- [x] BFF 统一转换业务错误和系统错误

---

## 6. Mock Backend

- [x] 将 `apps/server` 改为 NestJS 项目
- [x] 建立 `apps/server/src/main.ts`
- [x] 建立 `apps/server/src/app.module.ts`
- [x] 建立 `apps/server/src/mock-backend/mock-backend.module.ts`
- [x] 建立 `apps/server/src/mock-backend/mock-backend.controller.ts`
- [x] 建立 `apps/server/src/mock-backend/mock-backend.service.ts`
- [ ] 建立 `apps/server/src/mock-backend/users.service.ts`
- [ ] 建立 `apps/server/src/mock-backend/commodity.service.ts`
- [ ] 建立 `apps/server/src/mock-backend/upload.service.ts`
- [ ] 统一返回 `errno / errmsg / data`
- [ ] 支持成功响应
- [ ] 支持业务失败响应

---

## 7. 商品列表

- [ ] 实现 `apps/bff` 中的 `/api/commodity/list`
- [ ] 实现 `apps/server` 中的商品列表接口
- [ ] 列表页首屏数据可加载
- [x] 列表展示商品基础信息
- [ ] 支持分页
- [ ] 支持筛选
- [ ] 列表页区分加载态
- [ ] 列表页区分空态
- [ ] 列表页区分错误态

---

## 8. 商品详情

- [ ] 实现 `apps/bff` 中的 `/api/commodity/:id`
- [ ] 实现 `apps/server` 中的商品详情接口
- [x] 详情页支持动态路由
- [x] 详情页可展示商品基础详情信息
- [ ] 无效 `id` 时可返回异常结果
- [ ] 页面可处理详情加载失败

---

## 9. 创建商品

- [ ] 实现 `apps/bff` 中的 `/api/commodity/create`
- [ ] 实现 `apps/server` 中的创建商品接口
- [x] 创建页包含基础表单
- [ ] 表单支持必填校验
- [ ] 表单支持提交状态
- [ ] 提交成功后跳转详情页或列表页
- [ ] 提交失败时展示业务错误

---

## 10. 上传能力

- [ ] 实现 `apps/bff` 中的 `/api/upload`
- [ ] 实现 `apps/server` 中的上传接口
- [ ] 上传接口支持 `formData`
- [ ] 校验文件类型
- [ ] 校验文件大小
- [ ] 返回 mock 文件地址
- [ ] 页面可完成一次上传演示

---

## 11. Server / Client Component 分层

- [ ] 列表页首屏数据由 Server Component 获取
- [ ] 筛选区域由 Client Component 承担
- [ ] 分页交互由 Client Component 承担
- [ ] 创建页表单由 Client Component 承担
- [ ] 页面层不直接处理 BFF / backend 协议细节

---

## 12. 页面体验

- [ ] 列表页实现 `loading.tsx`
- [ ] 列表页实现 `error.tsx`
- [ ] 页面有基础空态展示
- [ ] 页面有基础错误提示
- [x] 页面跳转链路顺畅

---

## 13. 工程结构

- [x] 页面层、BFF 层、mock backend 层目录清晰
- [x] `apps/client` 使用 Next.js App Router
- [x] `apps/bff` 使用 NestJS
- [x] `apps/server` 使用 NestJS
- [x] 业务组件集中在 `apps/client/src/features/commodity`
- [x] 公共组件集中在 `apps/client/src/components`
- [x] 公共工具集中在 `apps/client/src/lib`
- [x] 鉴权逻辑不散落在页面中
- [ ] 响应解包逻辑不散落在页面中

---

## 14. 测试

- [ ] 为 `require-login` 编写测试
- [ ] 为 `response-handler` 编写测试
- [ ] 为 BFF `api-client` 编写测试
- [ ] 为关键 NestJS controller / service 编写测试

---

## 15. 文档与面试材料

- [x] `README.md` 说明如何启动项目
- [x] `README.md` 说明项目目录结构
- [x] `ARCHITECTURE.md` 说明页面层 / BFF 层 / backend 层职责
- [ ] 输出页面访问链路图
- [ ] 输出 BFF 请求链路图
- [ ] 输出登录链路图
- [ ] 输出 30 秒讲解稿
- [ ] 输出 3 分钟讲解稿

---

## 16. MVP 完成标准

满足以下条件即可认为 MVP 完成：

- [x] 可以完成登录
- [x] 可以访问商品列表
- [x] 可以查看商品详情
- [x] 可以进入创建商品页
- [ ] 可以演示上传
- [ ] 未登录拦截完整
- [ ] BFF 链路完整
- [ ] 页面体验完整
- [x] 文档可用于讲解
- [x] 项目可用于面试展示
