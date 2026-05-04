import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type LoginAuditLogDocument = HydratedDocument<LoginAuditLogEntity>;

@Schema({
  collection: "login_audit_logs",
  versionKey: false
})
export class LoginAuditLogEntity {
  @Prop({ required: true })
  username!: string;

  @Prop({ type: String, default: null })
  userId!: string | null;

  @Prop({ required: true, enum: ["success", "failure", "blocked"] })
  outcome!: "success" | "failure" | "blocked";

  @Prop({ required: true })
  ip!: string;

  @Prop({ required: true })
  userAgent!: string;

  @Prop({ required: true })
  traceId!: string;

  @Prop({ required: true })
  createdAt!: Date;

  @Prop({ type: String, default: null })
  reason!: string | null;
}

export const LoginAuditLogSchema = SchemaFactory.createForClass(LoginAuditLogEntity);

LoginAuditLogSchema.index({ username: 1, createdAt: -1 });
LoginAuditLogSchema.index({ userId: 1, createdAt: -1 });
LoginAuditLogSchema.index({ outcome: 1, createdAt: -1 });
LoginAuditLogSchema.index({ createdAt: -1 });
LoginAuditLogSchema.index({ traceId: 1 });
