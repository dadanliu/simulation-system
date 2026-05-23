import { Injectable } from "@nestjs/common";
import type { TaskStatusStreamConnection } from "./queue.types";

export type TaskStreamConnectionSnapshot = {
  byTaskId: Record<string, number>;
  byTenantId: Record<string, number>;
  byUserId: Record<string, number>;
  total: number;
};

@Injectable()
export class TaskStreamConnectionRegistry {
  private readonly byTaskId = new Map<string, Set<string>>();
  private readonly byTenantId = new Map<string, Set<string>>();
  private readonly byUserId = new Map<string, Set<string>>();
  private readonly connections = new Map<string, TaskStatusStreamConnection>();
  private nextConnectionId = 0;

  register(connection: TaskStatusStreamConnection) {
    const connectionId = `${connection.taskId}:${connection.userId}:${++this.nextConnectionId}`;

    this.connections.set(connectionId, connection);
    this.addToGroup(this.byTaskId, connection.taskId, connectionId);
    this.addToGroup(this.byTenantId, connection.tenantId, connectionId);
    this.addToGroup(this.byUserId, connection.userId, connectionId);

    let active = true;

    return () => {
      if (!active) {
        return;
      }

      active = false;
      this.unregister(connectionId);
    };
  }

  snapshot(): TaskStreamConnectionSnapshot {
    return {
      byTaskId: this.toCountRecord(this.byTaskId),
      byTenantId: this.toCountRecord(this.byTenantId),
      byUserId: this.toCountRecord(this.byUserId),
      total: this.connections.size
    };
  }

  private addToGroup(
    groups: Map<string, Set<string>>,
    groupKey: string,
    connectionId: string
  ) {
    const connectionIds = groups.get(groupKey) ?? new Set<string>();

    connectionIds.add(connectionId);
    groups.set(groupKey, connectionIds);
  }

  private removeFromGroup(
    groups: Map<string, Set<string>>,
    groupKey: string,
    connectionId: string
  ) {
    const connectionIds = groups.get(groupKey);

    if (!connectionIds) {
      return;
    }

    connectionIds.delete(connectionId);

    if (connectionIds.size === 0) {
      groups.delete(groupKey);
    }
  }

  private toCountRecord(groups: Map<string, Set<string>>) {
    return Object.fromEntries(
      Array.from(groups.entries()).map(([groupKey, connectionIds]) => [
        groupKey,
        connectionIds.size
      ])
    );
  }

  private unregister(connectionId: string) {
    const connection = this.connections.get(connectionId);

    if (!connection) {
      return;
    }

    this.connections.delete(connectionId);
    this.removeFromGroup(this.byTaskId, connection.taskId, connectionId);
    this.removeFromGroup(this.byTenantId, connection.tenantId, connectionId);
    this.removeFromGroup(this.byUserId, connection.userId, connectionId);
  }
}
