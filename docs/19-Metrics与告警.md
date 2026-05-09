# 8.2 Metrics 与告警

这一节解决的问题不是“有没有日志”，而是：

- 请求量有没有升高或下降
- 错误率有没有异常升高
- 延迟是不是变慢了
- 前端白屏发生在哪个页面、哪个版本、哪个用户上下文
- 前端 Web Vitals 和后端接口耗时能不能放到一起分析

本项目先采用“结构化日志承载 metrics 事件”的方式实现，不引入 Prometheus、Grafana、Sentry 这类外部系统。真实生产环境可以把这些 JSON log 接入日志平台或指标平台。

## 一、整体链路

```text
浏览器
  │
  ├─ Web Vitals: LCP / INP / CLS
  │       │
  │       ▼
  │   POST /api/client-metrics
  │       │
  │       ▼
  │   client web_vital_metric JSON 日志
  │
  ├─ 白屏 / Error Boundary / window.onerror
  │       │
  │       ▼
  │   POST /api/client-errors
  │       │
  │       ▼
  │   client frontend_error_reported JSON 日志
  │
  ▼
Next Client / BFF
  │
  ├─ RequestLoggingInterceptor
  │       ├─ http_request_completed
  │       └─ http_request_metric
  │
  ├─ 核心接口异常
  │       ├─ alert_core_api_error_rate_high
  │       └─ alert_core_api_latency_high
  │
  ▼
Backend
  │
  └─ http_request_metric
```

## 二、为什么用 RED 指标

RED 是接口服务最常用的一组三类指标：

```text
R = Rate      请求量
E = Errors    错误数 / 错误率
D = Duration  延迟
```

对应到本项目的字段：

| 指标   | 字段               | 说明                              |
| ------ | ------------------ | --------------------------------- |
| 请求量 | `requestCount`     | 当前滚动窗口内该 route 的请求数   |
| 错误数 | `serverErrorCount` | 当前滚动窗口内 5xx 数量           |
| 错误率 | `serverErrorRate`  | `serverErrorCount / requestCount` |
| 延迟   | `durationMs`       | 单次请求耗时                      |
| P95    | `p95Ms`            | 95% 请求快于这个耗时              |
| P99    | `p99Ms`            | 99% 请求快于这个耗时              |

为什么看 P95 / P99，而不只看平均值？

```text
请求耗时: 20ms, 22ms, 25ms, 27ms, 2000ms

平均值约 418ms
P95 接近 2000ms
```

平均值会把极慢请求摊平，P95/P99 更容易暴露“少量用户已经很慢”的问题。

## 三、商品列表 P95 怎么看

商品列表接口：

```text
GET /api/commodity/list
```

BFF 每次请求都会输出一条 metrics 事件：

```json
{
  "timestamp": "2026-05-09T10:00:00.000Z",
  "level": "info",
  "service": "bff",
  "context": "HttpMetrics",
  "event": "http_request_metric",
  "method": "GET",
  "route": "GET /api/commodity/list",
  "status": 200,
  "durationMs": 42,
  "requestCount": 12,
  "serverErrorCount": 0,
  "serverErrorRate": 0,
  "p95Ms": 86,
  "p99Ms": 110,
  "traceId": "trace_xxx"
}
```

查询 `event=http_request_metric route="GET /api/commodity/list"` 就能看到商品列表接口的 P95。

## 四、5xx 错误率告警

核心接口目前预留了商品列表告警策略：

```text
route: GET /api/commodity/list
窗口: 5 分钟滚动窗口
最小样本数: 5
5xx 错误率阈值: 5%
告警冷却: 60 秒
```

当错误率升高时，会输出：

```json
{
  "level": "warn",
  "service": "bff",
  "context": "HttpMetrics",
  "event": "alert_core_api_error_rate_high",
  "alertKey": "GET /api/commodity/list:5xx_error_rate",
  "route": "GET /api/commodity/list",
  "severity": "critical",
  "serverErrorRate": 0.2,
  "errorRateThreshold": 0.05,
  "p95Ms": 120,
  "traceId": "trace_xxx"
}
```

为什么要有“最小样本数”和“冷却时间”？

```text
没有最小样本数:
1 次请求，1 次失败 = 100% 错误率，容易误报

没有冷却时间:
持续故障期间每个请求都告警，告警通道会被刷爆
```

所以告警要同时满足：

```text
样本足够多
+ 错误率超过阈值
+ 距离上次告警超过冷却时间
```

## 五、前端 Web Vitals

前端通过 `useReportWebVitals` 采集浏览器性能指标：

```text
LCP: 最大内容绘制，反映首屏主要内容加载速度
INP: 用户交互延迟，反映点击、输入后的响应速度
CLS: 布局偏移，反映页面是否跳动
```

采集入口：

- [web-vitals-reporter.tsx](/Users/liuxing/Desktop/Space/beike-simulation/next-bff/apps/client/src/components/web-vitals-reporter.tsx:1)
- [client-metrics-report.ts](/Users/liuxing/Desktop/Space/beike-simulation/next-bff/apps/client/src/lib/client-metrics-report.ts:1)
- [api/client-metrics/route.ts](/Users/liuxing/Desktop/Space/beike-simulation/next-bff/apps/client/app/api/client-metrics/route.ts:1)

日志形态：

```json
{
  "level": "info",
  "service": "client",
  "context": "ClientMetrics",
  "event": "web_vital_metric",
  "appVersion": "local",
  "metricName": "LCP",
  "metricValue": 1800,
  "metricRating": "good",
  "page": "/present/commodity/list",
  "url": "http://localhost:3000/present/commodity/list",
  "user": {
    "id": "u1",
    "username": "admin",
    "roles": ["admin"]
  }
}
```

## 六、前端白屏错误定位

白屏类错误通常来自：

- React Error Boundary
- `window.onerror`
- `window.unhandledrejection`
- 接口错误被页面渲染时抛出

本项目上报到：

- [client-error-reporter.tsx](/Users/liuxing/Desktop/Space/beike-simulation/next-bff/apps/client/src/components/client-error-reporter.tsx:1)
- [client-error-report.ts](/Users/liuxing/Desktop/Space/beike-simulation/next-bff/apps/client/src/lib/client-error-report.ts:1)
- [api/client-errors/route.ts](/Users/liuxing/Desktop/Space/beike-simulation/next-bff/apps/client/app/api/client-errors/route.ts:1)

日志字段包含：

| 字段         | 作用                                        |
| ------------ | ------------------------------------------- |
| `page`       | 出错页面                                    |
| `appVersion` | 前端版本，用于匹配 source map               |
| `traceId`    | 如果错误来自接口，可关联 BFF / backend 日志 |
| `status`     | HTTP 状态码                                 |
| `stack`      | 前端堆栈                                    |
| `user`       | 当前登录用户上下文                          |
| `userAgent`  | 浏览器环境                                  |

```text
白屏日志 page + appVersion
  │
  ├─ 找到哪个页面、哪个版本出错
  │
  ├─ 用 stack + source map 定位源码
  │
  └─ 如果有 traceId，继续查 BFF / backend 同一条链路
```

## 七、前端性能和接口耗时如何关联

关联分析不是靠一个字段解决，而是靠多个维度拼起来：

```text
前端 Web Vitals
  page=/present/commodity/list
  appVersion=local
  metricName=LCP

BFF 接口 metrics
  route=GET /api/commodity/list
  p95Ms=860
  traceId=trace_xxx

Backend 接口 metrics
  route=GET /api/mock/commodities
  p95Ms=620
  traceId=trace_xxx
```

分析顺序：

```text
LCP 变慢
  │
  ├─ 看同一时间段商品列表 BFF P95 是否升高
  │
  ├─ 如果 BFF P95 高，继续用 traceId 查 backend
  │
  ├─ 如果 BFF 不慢，看前端资源、图片、JS 执行、渲染阻塞
  │
  └─ 如果只发生在某版本，用 appVersion + source map 定位发布变更
```

## 八、验收对应

| 验收项                           | 当前设计                                                               |
| -------------------------------- | ---------------------------------------------------------------------- |
| 能看到商品列表接口 P95           | `event=http_request_metric route="GET /api/commodity/list" p95Ms`      |
| 5xx 错误率升高能告警             | `alert_core_api_error_rate_high`                                       |
| 前端白屏错误能定位到页面和版本   | `frontend_error_reported` 包含 `page`、`appVersion`、`stack`           |
| 前端性能指标和接口耗时能关联分析 | `web_vital_metric.page/appVersion` + BFF/backend `route/p95Ms/traceId` |
