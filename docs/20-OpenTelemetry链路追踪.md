# 8.3 OpenTelemetry 链路追踪

这一节解决的是：

```text
一次用户请求到底慢在哪里？

前端页面
  -> BFF
    -> backend
      -> MongoDB
```

8.1 的结构化日志回答“发生了什么”，8.2 的 metrics 回答“整体健康吗”，8.3 的 tracing 回答“这一次请求的调用树是什么样”。

## 一、整体设计

```text
Browser
  │
  │  x-trace-id
  ▼
BFF HTTP server span
  │
  ├─ BFF Controller / Service
  │
  └─ span: BFF -> backend
        │
        │  traceparent + x-trace-id
        ▼
      Backend HTTP server span
        │
        ├─ Backend Controller / Service
        │
        └─ span: MongoDB commodities list
              │
              ▼
            MongoDB find + count
```

项目里同时保留两种 ID：

| 字段                     | 作用                               |
| ------------------------ | ---------------------------------- |
| `x-trace-id` / `traceId` | 业务日志、前端错误、响应体排查使用 |
| `traceparent`            | OpenTelemetry 标准上下文传播       |
| `otelTraceId`            | tracing 平台里的 trace id          |
| `otelSpanId`             | 当前日志所在 span                  |

## 二、OpenTelemetry 初始化

BFF：

- [open-telemetry.ts](/Users/liuxing/Desktop/Space/beike-simulation/next-bff/apps/bff/src/common/tracing/open-telemetry.ts:1)
- [main.ts](/Users/liuxing/Desktop/Space/beike-simulation/next-bff/apps/bff/src/main.ts:1)

Backend：

- [open-telemetry.ts](/Users/liuxing/Desktop/Space/beike-simulation/next-bff/apps/server/src/common/tracing/open-telemetry.ts:1)
- [main.ts](/Users/liuxing/Desktop/Space/beike-simulation/next-bff/apps/server/src/main.ts:1)

启动时如果满足任一条件，就启用 tracing：

```text
OTEL_TRACING_ENABLED=true
或
OTEL_EXPORTER_OTLP_ENDPOINT / OTEL_EXPORTER_OTLP_TRACES_ENDPOINT 有值
```

例如接本地 OTLP collector：

```bash
OTEL_TRACING_ENABLED=true \
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318 \
pnpm dev:all
```

服务名默认是：

```text
BFF     next-bff-bff
Backend next-bff-backend
```

## 三、BFF 到 backend 调用 span

位置：

- [api-client.service.ts](/Users/liuxing/Desktop/Space/beike-simulation/next-bff/apps/bff/src/bff/api-client.service.ts:1)
- [observed-span.ts](/Users/liuxing/Desktop/Space/beike-simulation/next-bff/apps/bff/src/common/tracing/observed-span.ts:1)

BFF 调 backend 时创建 span：

```text
span name: BFF -> backend
kind: CLIENT
attributes:
  http.request.method
  server.address
  url.path
  app.trace_id
```

关键点：

```text
span active 后
  │
  ├─ propagation.inject(...)
  │    写入 traceparent
  │
  ├─ 继续写 x-trace-id
  │    用于日志和前端排查
  │
  └─ fetch backend
```

所以 backend 收到请求时，OpenTelemetry 能把它挂到同一条 trace 下。

## 四、Backend 到 MongoDB span

位置：

- [commodity.service.ts](/Users/liuxing/Desktop/Space/beike-simulation/next-bff/apps/server/src/mock-backend/commodity.service.ts:1)
- [observed-span.ts](/Users/liuxing/Desktop/Space/beike-simulation/next-bff/apps/server/src/common/tracing/observed-span.ts:1)

商品列表查询会包一层数据库 span：

```text
span name: MongoDB commodities list
kind: CLIENT
attributes:
  db.system.name=mongodb
  db.collection.name=commodities
  db.operation.name=find_and_count
  next_bff.commodity.limit
  next_bff.commodity.offset
  next_bff.commodity.sort_field
  next_bff.commodity.sort_direction
```

这个 span 包住：

```text
commodityModel.find(...)
commodityModel.countDocuments(...)
```

所以 tracing 平台上能看到：

```text
BFF -> backend
  └─ Backend HTTP handler
      └─ MongoDB commodities list
```

## 五、traceId 与日志关联

结构化日志现在会自动读取当前 active span：

- [structured-log.ts](/Users/liuxing/Desktop/Space/beike-simulation/next-bff/apps/bff/src/common/logging/structured-log.ts:1)
- [structured-log.ts](/Users/liuxing/Desktop/Space/beike-simulation/next-bff/apps/server/src/common/logging/structured-log.ts:1)

如果当前上下文里有 OTel span，日志会自动带：

```json
{
  "traceId": "业务 trace id",
  "otelTraceId": "OpenTelemetry trace id",
  "otelSpanId": "当前 span id"
}
```

排查方式：

```text
从 tracing 平台拿 otelTraceId
  │
  ▼
去日志平台搜 otelTraceId
  │
  ▼
看到同一次调用下的结构化日志、错误日志、metrics 日志
```

反过来也可以：

```text
从前端错误拿 traceId
  │
  ▼
查 BFF 日志 traceId
  │
  ▼
拿 otelTraceId
  │
  ▼
跳 tracing 平台看调用树
```

## 六、慢请求怎么定位

当商品列表变慢：

```text
GET /present/commodity/list
  │
  ▼
GET /api/commodity/list
  │
  ▼
BFF -> backend
  │
  ▼
Backend -> MongoDB
```

在 tracing 平台看 duration 分布：

```text
BFF HTTP server span: 1200ms
  BFF -> backend: 1100ms
    Backend HTTP server span: 1050ms
      MongoDB commodities list: 980ms
```

这说明瓶颈主要在 MongoDB 查询。

如果看到：

```text
BFF HTTP server span: 1200ms
  BFF -> backend: 80ms
```

说明慢在 BFF 自己处理、权限校验、响应组装或网络排队之前，不在 backend。

## 七、前端错误如何关联后端 trace

前端错误上报已经包含：

```text
traceId
page
appVersion
stack
user
```

链路：

```text
前端 Error Boundary
  │
  ▼
POST /api/client-errors
  │
  ▼
日志 event=frontend_error_reported
  │
  ▼
用 traceId 查 BFF 日志
  │
  ▼
找到 otelTraceId
  │
  ▼
打开 tracing 平台 trace
```

注意：浏览器当前没有直接创建 OpenTelemetry browser span。这里的端到端关联方式是：

```text
前端错误 traceId
  -> BFF 日志 traceId
  -> BFF 日志 otelTraceId
  -> tracing 平台调用树
```

## 八、验收对应

| 验收项                                                 | 当前设计                                                          |
| ------------------------------------------------------ | ----------------------------------------------------------------- |
| 能在 tracing 平台看到 BFF -> backend -> MongoDB 调用链 | BFF/backend 初始化 OTel，BFF backend 调用和 MongoDB 查询都有 span |
| 能定位慢在 BFF、backend 还是数据库                     | 调用树 span duration 可直接对比                                   |
| 错误 trace 能跳转到相关日志                            | 日志自动写入 `otelTraceId` / `otelSpanId`                         |
| 前端报错可提供 traceId 排查                            | `/api/client-errors` 日志包含 `traceId`、`page`、`appVersion`     |
