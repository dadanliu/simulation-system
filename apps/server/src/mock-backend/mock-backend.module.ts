import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import { HealthModule } from "../health/health.module";
import { CommodityService } from "./commodity.service";
import { MockBackendController } from "./mock-backend.controller";
import { MockBackendService } from "./mock-backend.service";
import { Commodity, CommoditySchema } from "./schemas/commodity.schema";
import { FileRegistryService } from "./storage/file-registry.service";
import { LocalStorageService } from "./storage/local-storage.service";
import { OssStorageService } from "./storage/oss-storage.service";
import { S3StorageService } from "./storage/s3-storage.service";
import { STORAGE_SERVICE } from "./storage/storage.tokens";
import { UploadService } from "./upload.service";
import { UsersService } from "./users.service";

@Module({
  imports: [
    ConfigModule,
    HealthModule,
    MongooseModule.forFeature([
      { name: Commodity.name, schema: CommoditySchema }
    ])
  ],
  controllers: [MockBackendController],
  providers: [
    MockBackendService,
    UsersService,
    CommodityService,
    FileRegistryService,
    LocalStorageService,
    S3StorageService,
    OssStorageService,
    {
      inject: [
        ConfigService,
        LocalStorageService,
        S3StorageService,
        OssStorageService
      ],
      provide: STORAGE_SERVICE,
      useFactory: (
        configService: ConfigService,
        localStorageService: LocalStorageService,
        s3StorageService: S3StorageService,
        ossStorageService: OssStorageService
      ) => {
        const storageDriver =
          configService.getOrThrow<string>("STORAGE_DRIVER");

        if (storageDriver === "s3") {
          return s3StorageService;
        }

        if (storageDriver === "oss") {
          return ossStorageService;
        }

        return localStorageService;
      }
    },
    UploadService
  ]
})
export class MockBackendModule {}
