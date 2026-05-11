import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";

@Module({
  imports: [
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        serverSelectionTimeoutMS: Number(
          configService.get<string>("HEALTH_CHECK_TIMEOUT_MS", "2000")
        ),
        uri: configService.getOrThrow<string>("MONGODB_URI")
      })
    })
  ],
  exports: [MongooseModule]
})
export class DatabaseModule {}
