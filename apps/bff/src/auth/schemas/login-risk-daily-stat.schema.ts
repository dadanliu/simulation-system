import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type LoginRiskDailyStatDocument =
  HydratedDocument<LoginRiskDailyStatEntity>;

export type LoginRiskDailyTotals = {
  attempts: number;
  blocked: number;
  failure: number;
  success: number;
  uniqueIps: number;
  uniqueUsernames: number;
};

export type LoginRiskDailyUserStat = {
  attempts: number;
  blocked: number;
  failures: number;
  lastSeenAt: Date;
  riskScore: number;
  username: string;
};

export type LoginRiskDailyIpStat = {
  attempts: number;
  blocked: number;
  failures: number;
  ip: string;
  lastSeenAt: Date;
  riskScore: number;
  uniqueUsernames: number;
};

@Schema({ collection: "login_risk_daily_stats", versionKey: false })
export class LoginRiskDailyStatEntity {
  @Prop({ required: true, unique: true })
  date!: string;

  @Prop({ required: true })
  windowStart!: Date;

  @Prop({ required: true })
  windowEnd!: Date;

  @Prop({ required: true })
  generatedAt!: Date;

  @Prop({ required: true, type: Object })
  totals!: LoginRiskDailyTotals;

  @Prop({ default: [], type: [Object] })
  topFailedUsers!: LoginRiskDailyUserStat[];

  @Prop({ default: [], type: [Object] })
  lockedUsers!: LoginRiskDailyUserStat[];

  @Prop({ default: [], type: [Object] })
  abnormalIps!: LoginRiskDailyIpStat[];
}

export const LoginRiskDailyStatSchema = SchemaFactory.createForClass(
  LoginRiskDailyStatEntity
);

LoginRiskDailyStatSchema.index({ date: -1 });
LoginRiskDailyStatSchema.index({ "totals.failure": -1, date: -1 });
LoginRiskDailyStatSchema.index({ "totals.blocked": -1, date: -1 });
