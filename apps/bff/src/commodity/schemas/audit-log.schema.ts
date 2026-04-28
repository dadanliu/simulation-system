import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type AuditLogDocument = HydratedDocument<AuditLogEntity>;

@Schema({
  collection: "audit_logs",
  versionKey: false
})
export class AuditLogEntity {
  @Prop({ required: true })
  action!: string;

  @Prop({ type: Object, default: null })
  after!: Record<string, unknown> | null;

  @Prop({ type: Object, default: null })
  before!: Record<string, unknown> | null;

  @Prop({ required: true })
  createdAt!: Date;

  @Prop({ required: true })
  operator!: string;

  @Prop({ type: String, default: null })
  reason!: string | null;

  @Prop({ required: true })
  resourceId!: string;

  @Prop({ required: true })
  resourceType!: string;

  @Prop({ required: true })
  traceId!: string;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLogEntity);

AuditLogSchema.index({ resourceType: 1, createdAt: -1 });
AuditLogSchema.index({ resourceId: 1, createdAt: -1 });
AuditLogSchema.index({ operator: 1, createdAt: -1 });
AuditLogSchema.index({ traceId: 1 });
