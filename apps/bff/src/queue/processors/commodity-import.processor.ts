import { Processor, WorkerHost } from "@nestjs/bullmq";
import { ConfigService } from "@nestjs/config";
import { Injectable } from "@nestjs/common";
import type { Job } from "bullmq";
import { ResponseHandlerService } from "../../bff/response-handler.service";
import { CommodityCacheService } from "../../commodity/commodity-cache.service";
import { COMMODITY_IMPORT_QUEUE } from "../queue.constants";
import type {
  CommodityImportJobData,
  CommodityImportResult
} from "../queue.types";

type CommodityCreateResult = {
  id: string;
  name: string;
};

const COMMODITY_IMPORT_ITEM_DELAY_MS = 500;

@Injectable()
// @Processor 把这个类注册成 BullMQ Worker，专门消费 commodity-import 队列里的 job。
// concurrency: 1 表示同一个 Worker 实例一次只允许 1 个导入 job 进入 process，避免批量写入同时压垮 Backend/Mongo。
@Processor(COMMODITY_IMPORT_QUEUE, { concurrency: 1 })
export class CommodityImportProcessor extends WorkerHost {
  constructor(
    private readonly commodityCacheService: CommodityCacheService,
    private readonly configService: ConfigService,
    private readonly responseHandlerService: ResponseHandlerService
  ) {
    // WorkerHost 是 @nestjs/bullmq 提供的基类；继承后，process(job) 就是 BullMQ 调用的任务处理入口。
    super();
  }

  async process(job: Job<CommodityImportJobData>) {
    // 每个 BullMQ job 会调用一次 process。job.data 是提交任务时写入 Redis 的导入参数。
    const created: CommodityImportResult["created"] = [];
    const failed: CommodityImportResult["failed"] = [];
    const total = job.data.items.length;

    // 当前 MVP 选择顺序导入：一个 job 内部逐条 await，而不是把 200 条商品同时打到 Backend。
    for (const [index, item] of job.data.items.entries()) {
      // 进度写回 Redis，GET /api/tasks/:taskId 查询时会看到 progress。
      await job.updateProgress({
        current: index + 1,
        percent: Math.round(((index + 1) / total) * 100),
        total
      });
      await this.delayForLocalSimulation();

      // dryRun 用来验证请求结构和队列链路，不真正创建商品，也不会刷新商品列表缓存。
      if (job.data.dryRun) {
        continue;
      }

      try {
        // 真正创建商品仍然交给 Backend；BFF Worker 只负责异步编排和透传用户/租户/trace 上下文。
        const commodity = await this.createCommodity(job.data, item);
        created.push({
          id: commodity.id,
          name: commodity.name
        });
      } catch (error) {
        // 单条商品失败不让整个 job 失败；记录到 failed 后继续处理下一条，方便返回部分成功结果。
        failed.push({
          index,
          message: error instanceof Error ? error.message : "import failed",
          name: item.name
        });
      }
    }

    // 只有真实创建过商品才需要清列表缓存；dryRun 或全失败不做无意义的缓存失效。
    if (created.length > 0) {
      await this.commodityCacheService.invalidateCommodityList();
    }

    // return value 会被 BullMQ 保存到 job.returnvalue，任务查询接口会把它作为 result 返回。
    return {
      created,
      dryRun: job.data.dryRun,
      failed,
      total
    } satisfies CommodityImportResult;
  }

  private async createCommodity(
    data: CommodityImportJobData,
    item: CommodityImportJobData["items"][number]
  ) {
    // Worker 运行在 BFF 侧，但商品创建的领域规则仍在 Backend；这里通过内部 HTTP 调用复用 Backend 能力。
    const response = await fetch(this.backendUrl("/api/commodity/create"), {
      body: JSON.stringify({
        ...item,
        createdBy: data.requestedBy
      }),
      headers: {
        "Content-Type": "application/json",
        "x-tenant-id": data.tenantId ?? "",
        "x-trace-id": data.traceId,
        "x-user-id": data.requestedBy
      },
      method: "POST"
    });

    // 抛错会被上层 catch 记录为单条失败；如果这里不 catch，BullMQ 会把整个 job 标记为 failed。
    if (!response.ok) {
      throw new Error(`backend create failed with status ${response.status}`);
    }

    const payload = await response.json();
    // Backend 返回统一响应 envelope，BFF 统一 unwrap 成业务结果。
    return this.responseHandlerService.unwrap<CommodityCreateResult>(payload);
  }

  private backendUrl(path: string) {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return `${this.configService.getOrThrow<string>("BACKEND_BASE_URL")}${normalizedPath}`;
  }

  private delayForLocalSimulation() {
    return new Promise<void>((resolve) => {
      setTimeout(resolve, COMMODITY_IMPORT_ITEM_DELAY_MS);
    });
  }
}
