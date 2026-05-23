import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Req,
  Sse,
  UseGuards
} from "@nestjs/common";
import type { MessageEvent } from "@nestjs/common";
import {
  ApiCookieAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags
} from "@nestjs/swagger";
import type { Request } from "express";
import { from, map, switchMap, tap, type Observable } from "rxjs";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { ErrorResponseDto } from "../common/swagger/error-response.dto";
import { RequirePermissions } from "../permission/permissions.decorator";
import { PermissionsGuard } from "../permission/permissions.guard";
import type { AuthUser } from "../user/user.types";
import { CreateCommodityImportTaskDto } from "./dto/create-commodity-import-task.dto";
import { TaskQueueService } from "./task-queue.service";
import type { TaskJobDataBase } from "./queue.types";

@ApiTags("Tasks")
@Controller("api/tasks")
@UseGuards(AuthGuard, PermissionsGuard)
export class QueueController {
  constructor(private readonly taskQueueService: TaskQueueService) {}

  @Sse(":taskId/events")
  @ApiCookieAuth("next_bff_session")
  @ApiOperation({ summary: "订阅异步任务进度 SSE" })
  @ApiParam({
    description: "Task ID returned by an async task API",
    example: "commodity-import:1b2c3d",
    name: "taskId"
  })
  @ApiResponse({ status: 200, description: "任务进度事件流已建立" })
  @ApiResponse({ status: 401, description: "未登录", type: ErrorResponseDto })
  @ApiResponse({
    status: 403,
    description: "无权查看任务",
    type: ErrorResponseDto
  })
  @ApiResponse({
    status: 404,
    description: "任务不存在",
    type: ErrorResponseDto
  })
  taskEvents(
    @CurrentUser() user: AuthUser,
    @Param("taskId") taskId: string
  ): Observable<MessageEvent> {
    return from(this.taskQueueService.getTaskData(taskId)).pipe(
      tap(({ data }) => this.assertTaskAccess(user, data)),
      switchMap(({ data, status }) =>
        this.taskQueueService.streamTaskStatus(taskId, {
          connection: {
            taskId,
            tenantId: data.tenantId ?? user.tenantId,
            userId: user.id
          },
          initialStatus: status
        })
      ),
      map((event) => ({
        data: event.status,
        id: event.status.taskId,
        retry: 1000,
        type: event.type
      }))
    );
  }

  @Get(":taskId")
  @ApiCookieAuth("next_bff_session")
  @ApiOperation({ summary: "查询异步任务状态" })
  @ApiParam({
    description: "Task ID returned by an async task API",
    example: "commodity-import:1b2c3d",
    name: "taskId"
  })
  @ApiResponse({ status: 200, description: "任务状态查询成功" })
  @ApiResponse({ status: 401, description: "未登录", type: ErrorResponseDto })
  @ApiResponse({
    status: 403,
    description: "无权查看任务",
    type: ErrorResponseDto
  })
  @ApiResponse({
    status: 404,
    description: "任务不存在",
    type: ErrorResponseDto
  })
  async getTask(
    @CurrentUser() user: AuthUser,
    @Param("taskId") taskId: string
  ) {
    const { data, status } = await this.taskQueueService.getTaskData(taskId);

    this.assertTaskAccess(user, data);

    return status;
  }

  @Post("commodity-imports")
  @RequirePermissions("commodity:create")
  @ApiCookieAuth("next_bff_session")
  @ApiOperation({ summary: "提交商品批量导入任务" })
  @ApiResponse({ status: 200, description: "商品批量导入任务已提交" })
  @ApiResponse({ status: 401, description: "未登录", type: ErrorResponseDto })
  @ApiResponse({
    status: 403,
    description: "无商品创建权限",
    type: ErrorResponseDto
  })
  createCommodityImportTask(
    @Req() request: Request & { traceId?: string },
    @CurrentUser() user: AuthUser,
    @Body() body: CreateCommodityImportTaskDto
  ) {
    return this.taskQueueService.enqueueCommodityImport({
      dryRun: body.dryRun,
      items: body.items,
      requestedBy: user.id,
      tenantId: user.tenantId,
      traceId: request.traceId ?? ""
    });
  }

  private assertTaskAccess(user: AuthUser, task: TaskJobDataBase) {
    const sameTenant = task.tenantId === user.tenantId;
    const isOwner = user.id === task.requestedBy;
    const isTenantAdmin = user.roles.includes("admin") && sameTenant;

    if (isOwner || isTenantAdmin) {
      return;
    }

    throw new ForbiddenException("permission denied");
  }
}
