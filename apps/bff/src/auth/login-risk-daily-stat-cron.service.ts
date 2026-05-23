import { Injectable } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import {
  getErrorLogFields,
  writeStructuredLog
} from "../common/logging/structured-log";
import { LoginRiskDailyStatService } from "./login-risk-daily-stat.service";

@Injectable()
export class LoginRiskDailyStatCronService {
  constructor(
    private readonly loginRiskDailyStatService: LoginRiskDailyStatService
  ) {}

  @Cron("5 0 * * *", { timeZone: "UTC" })
  async generatePreviousDayStat() {
    try {
      const stat =
        await this.loginRiskDailyStatService.generateForPreviousUtcDay();

      writeStructuredLog({
        context: LoginRiskDailyStatCronService.name,
        event: "login_risk_daily_stat.generated",
        fields: {
          blocked: stat.totals.blocked,
          date: stat.date,
          failure: stat.totals.failure,
          success: stat.totals.success,
          attempts: stat.totals.attempts
        },
        level: "info"
      });
    } catch (error) {
      writeStructuredLog({
        context: LoginRiskDailyStatCronService.name,
        event: "login_risk_daily_stat.generate_failed",
        fields: getErrorLogFields(error),
        level: "error"
      });
    }
  }
}
