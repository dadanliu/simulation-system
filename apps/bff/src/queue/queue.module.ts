import { Global, Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { AuthModule } from "../auth/auth.module";
import { BffModule } from "../bff/bff.module";
import { CommodityCacheService } from "../commodity/commodity-cache.service";
import { PermissionModule } from "../permission/permission.module";
import { COMMODITY_IMPORT_QUEUE } from "./queue.constants";
import { createBullRedisConnection } from "./redis-connection";
import { QueueController } from "./queue.controller";
import { TaskQueueService } from "./task-queue.service";
import { CommodityImportProcessor } from "./processors/commodity-import.processor";

@Global()
@Module({
  imports: [
    AuthModule,
    BffModule,
    ConfigModule,
    PermissionModule,
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: createBullRedisConnection(
          configService.getOrThrow<string>("REDIS_URL")
        ),
        defaultJobOptions: {
          removeOnComplete: {
            age: 24 * 60 * 60,
            count: 1000
          },
          removeOnFail: {
            age: 7 * 24 * 60 * 60,
            count: 5000
          }
        },
        prefix: "next-bff"
      })
    }),
    BullModule.registerQueue({ name: COMMODITY_IMPORT_QUEUE })
  ],
  controllers: [QueueController],
  exports: [TaskQueueService],
  providers: [CommodityCacheService, CommodityImportProcessor, TaskQueueService]
})
export class QueueModule {}
