import { Module } from "@nestjs/common";
import { ApiClientService } from "./api-client.service";
import { RequestHeadersService } from "./request-headers.service";
import { ResponseHandlerService } from "./response-handler.service";

@Module({
  providers: [ApiClientService, RequestHeadersService, ResponseHandlerService],
  exports: [ApiClientService, RequestHeadersService, ResponseHandlerService]
})
export class BffModule {}
