# Next.js + BFF MVP 功能清单

这份文档只记录一件事：

```text
这个项目最终需要完成哪些功能点。
```

---

## 1. 项目基础

- [ ] 初始化 `Next.js App Router` 项目
- [ ] 配置基础目录结构
- [ ] 建立 `README.md`
- [ ] 建立 `ARCHITECTURE.md`
- [ ] 可以本地启动和访问

---

## 2. 路由与页面骨架

- [ ] 实现 `/`
- [ ] `/` 重定向到 `/present/commodity/list`
- [ ] 实现 `/login`
- [ ] 实现 `/present/layout.tsx`
- [ ] 实现 `/present/commodity/list`
- [ ] 实现 `/present/commodity/[id]`
- [ ] 实现 `/present/commodity/create`
- [ ] 页面壳包含导航区和顶部信息区

---

## 3. 登录与会话

- [ ] 实现 `/api/auth/login`
- [ ] 实现 `/api/auth/logout`
- [ ] 实现 `/api/auth/me`
- [ ] 登录成功后写入 cookie
- [ ] 登出后清除 cookie
- [ ] 实现 `get-current-user`
- [ ] 实现 `require-login`

---

## 4. Middleware

- [ ] 新增 `middleware.ts`
- [ ] 未登录访问 `/present/**` 时跳转 `/login`
- [ ] 未登录访问 `/api/**` 时返回 401
- [ ] 登录后允许访问受保护页面
- [ ] 登录后允许访问受保护 API

---

## 5. BFF 基础设施

- [ ] 建立 `src/server/bff/api-client.ts`
- [ ] 建立 `src/server/bff/request-headers.ts`
- [ ] 建立 `src/server/bff/response-handler.ts`
- [ ] 建立 `src/server/bff/errors.ts`
- [ ] BFF 统一注入 `userId`
- [ ] BFF 统一注入 `traceId`
- [ ] BFF 统一解包后端响应
- [ ] BFF 统一转换业务错误和系统错误

---

## 6. Mock Backend

- [ ] 建立 `src/server/mock-backend/users.ts`
- [ ] 建立 `src/server/mock-backend/commodity.ts`
- [ ] 建立 `src/server/mock-backend/upload.ts`
- [ ] 统一返回 `errno / errmsg / data`
- [ ] 支持成功响应
- [ ] 支持业务失败响应

---

## 7. 商品列表

- [ ] 实现 `/api/commodity/list`
- [ ] 列表页首屏数据可加载
- [ ] 列表展示商品基础信息
- [ ] 支持分页
- [ ] 支持筛选
- [ ] 列表页区分加载态
- [ ] 列表页区分空态
- [ ] 列表页区分错误态

---

## 8. 商品详情

- [ ] 实现 `/api/commodity/[id]`
- [ ] 详情页支持动态路由
- [ ] 详情页可展示商品详细信息
- [ ] 无效 `id` 时可返回异常结果
- [ ] 页面可处理详情加载失败

---

## 9. 创建商品

- [ ] 实现 `/api/commodity/create`
- [ ] 创建页包含基础表单
- [ ] 表单支持必填校验
- [ ] 表单支持提交状态
- [ ] 提交成功后跳转详情页或列表页
- [ ] 提交失败时展示业务错误

---

## 10. 上传能力

- [ ] 实现 `/api/upload`
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
- [ ] 页面层不直接处理后端协议细节

---

## 12. 页面体验

- [ ] 列表页实现 `loading.tsx`
- [ ] 列表页实现 `error.tsx`
- [ ] 页面有基础空态展示
- [ ] 页面有基础错误提示
- [ ] 页面跳转链路顺畅

---

## 13. 工程结构

- [ ] 页面层、BFF 层、mock backend 层目录清晰
- [ ] 业务组件集中在 `src/features/commodity`
- [ ] 公共组件集中在 `src/components`
- [ ] 公共工具集中在 `src/lib`
- [ ] 鉴权逻辑不散落在页面中
- [ ] 响应解包逻辑不散落在页面中

---

## 14. 测试

- [ ] 为 `require-login` 编写测试
- [ ] 为 `response-handler` 编写测试
- [ ] 为 `api-client` 编写测试
- [ ] 为关键 API route 编写测试

---

## 15. 文档与面试材料

- [ ] `README.md` 说明如何启动项目
- [ ] `README.md` 说明项目目录结构
- [ ] `ARCHITECTURE.md` 说明页面层 / BFF 层 / backend 层职责
- [ ] 输出页面访问链路图
- [ ] 输出 BFF 请求链路图
- [ ] 输出登录链路图
- [ ] 输出 30 秒讲解稿
- [ ] 输出 3 分钟讲解稿

---

## 16. MVP 完成标准

满足以下条件即可认为 MVP 完成：

- [ ] 可以完成登录
- [ ] 可以访问商品列表
- [ ] 可以查看商品详情
- [ ] 可以创建商品
- [ ] 可以演示上传
- [ ] 未登录拦截完整
- [ ] BFF 链路完整
- [ ] 页面体验完整
- [ ] 文档可用于讲解
- [ ] 项目可用于面试展示
