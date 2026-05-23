import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { QueryLoginRiskDailyStatDto } from "./dto/query-login-risk-daily-stat.dto";
import {
  LoginAuditLogEntity,
  type LoginAuditLogDocument
} from "./schemas/login-audit-log.schema";
import {
  LoginRiskDailyStatEntity,
  type LoginRiskDailyIpStat,
  type LoginRiskDailyStatDocument,
  type LoginRiskDailyTotals,
  type LoginRiskDailyUserStat
} from "./schemas/login-risk-daily-stat.schema";

const DAY_MS = 24 * 60 * 60 * 1000;
const RISK_BLOCKED_WEIGHT = 5;
const MAX_RISK_SUBJECTS = 10;

type LoginAuditOutcome = "blocked" | "failure" | "success";

type LoginAuditLogForStats = {
  createdAt: Date | string;
  ip: string;
  outcome: LoginAuditOutcome;
  username: string;
};

type UserAccumulator = {
  blocked: number;
  failures: number;
  lastSeenAt: Date;
  username: string;
};

type IpAccumulator = {
  blocked: number;
  failures: number;
  ip: string;
  lastSeenAt: Date;
  usernames: Set<string>;
};

type PersistedUserStat = Omit<LoginRiskDailyUserStat, "lastSeenAt"> & {
  lastSeenAt: Date | string;
};

type PersistedIpStat = Omit<LoginRiskDailyIpStat, "lastSeenAt"> & {
  lastSeenAt: Date | string;
};

type PersistedDailyStat = {
  abnormalIps: PersistedIpStat[];
  date: string;
  generatedAt: Date | string;
  lockedUsers: PersistedUserStat[];
  topFailedUsers: PersistedUserStat[];
  totals: LoginRiskDailyTotals;
  windowEnd: Date | string;
  windowStart: Date | string;
};

@Injectable()
export class LoginRiskDailyStatService {
  constructor(
    @InjectModel(LoginRiskDailyStatEntity.name)
    private readonly loginRiskDailyStatModel: Model<LoginRiskDailyStatDocument>,
    @InjectModel(LoginAuditLogEntity.name)
    private readonly loginAuditLogModel: Model<LoginAuditLogDocument>
  ) {}

  generateForPreviousUtcDay(now = new Date()) {
    return this.generateForDate(
      new Date(this.getUtcDayStart(now).getTime() - DAY_MS)
    );
  }

  async generateForDate(date: Date | string) {
    const windowStart = this.getUtcDayStart(date);
    const windowEnd = new Date(windowStart.getTime() + DAY_MS);
    const logs = (await this.loginAuditLogModel
      .find({
        createdAt: {
          $gte: windowStart,
          $lt: windowEnd
        }
      })
      .select({ createdAt: 1, ip: 1, outcome: 1, username: 1 })
      .lean()) as LoginAuditLogForStats[];
    const stat = this.buildDailyStat(windowStart, windowEnd, logs);
    const saved = await this.loginRiskDailyStatModel
      .findOneAndUpdate(
        { date: stat.date },
        { $set: stat },
        { new: true, setDefaultsOnInsert: true, upsert: true }
      )
      .lean();

    return this.toRecord(saved as PersistedDailyStat);
  }

  async listStats(query: QueryLoginRiskDailyStatDto) {
    const filters: Record<string, unknown> = {};

    if (query.dateFrom || query.dateTo) {
      const date: Record<string, string> = {};

      if (query.dateFrom) {
        date.$gte = query.dateFrom;
      }

      if (query.dateTo) {
        date.$lte = query.dateTo;
      }

      filters.date = date;
    }

    const [stats, total] = await Promise.all([
      this.loginRiskDailyStatModel
        .find(filters)
        .sort({ date: -1 })
        .skip((query.page - 1) * query.pageSize)
        .limit(query.pageSize)
        .lean(),
      this.loginRiskDailyStatModel.countDocuments(filters)
    ]);

    return {
      list: (stats as PersistedDailyStat[]).map((stat) =>
        this.toRecord(stat)
      ),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total
      }
    };
  }

  private buildDailyStat(
    windowStart: Date,
    windowEnd: Date,
    logs: LoginAuditLogForStats[]
  ) {
    const ipSet = new Set<string>();
    const userSet = new Set<string>();
    const userMap = new Map<string, UserAccumulator>();
    const ipMap = new Map<string, IpAccumulator>();
    const totals: LoginRiskDailyTotals = {
      attempts: logs.length,
      blocked: 0,
      failure: 0,
      success: 0,
      uniqueIps: 0,
      uniqueUsernames: 0
    };

    for (const log of logs) {
      const createdAt = new Date(log.createdAt);
      const ip = log.ip?.trim() || "unknown";
      const username = log.username.trim().toLowerCase();

      ipSet.add(ip);
      userSet.add(username);
      totals[log.outcome] += 1;

      if (log.outcome === "success") {
        continue;
      }

      this.addUserRisk(userMap, username, log.outcome, createdAt);
      this.addIpRisk(ipMap, ip, username, log.outcome, createdAt);
    }

    totals.uniqueIps = ipSet.size;
    totals.uniqueUsernames = userSet.size;

    const userStats = [...userMap.values()]
      .map((item) => this.toUserStat(item))
      .sort((left, right) =>
        this.compareRiskSubjects(left, right, left.username, right.username)
      );
    const ipStats = [...ipMap.values()]
      .map((item) => this.toIpStat(item))
      .sort((left, right) =>
        this.compareRiskSubjects(left, right, left.ip, right.ip)
      );

    return {
      abnormalIps: ipStats.slice(0, MAX_RISK_SUBJECTS),
      date: this.toDateKey(windowStart),
      generatedAt: new Date(),
      lockedUsers: userStats
        .filter((item) => item.blocked > 0)
        .slice(0, MAX_RISK_SUBJECTS),
      topFailedUsers: userStats.slice(0, MAX_RISK_SUBJECTS),
      totals,
      windowEnd,
      windowStart
    };
  }

  private addUserRisk(
    userMap: Map<string, UserAccumulator>,
    username: string,
    outcome: Exclude<LoginAuditOutcome, "success">,
    createdAt: Date
  ) {
    const item =
      userMap.get(username) ??
      ({
        blocked: 0,
        failures: 0,
        lastSeenAt: createdAt,
        username
      } satisfies UserAccumulator);

    if (outcome === "blocked") {
      item.blocked += 1;
    } else {
      item.failures += 1;
    }

    if (createdAt > item.lastSeenAt) {
      item.lastSeenAt = createdAt;
    }

    userMap.set(username, item);
  }

  private addIpRisk(
    ipMap: Map<string, IpAccumulator>,
    ip: string,
    username: string,
    outcome: Exclude<LoginAuditOutcome, "success">,
    createdAt: Date
  ) {
    const item =
      ipMap.get(ip) ??
      ({
        blocked: 0,
        failures: 0,
        ip,
        lastSeenAt: createdAt,
        usernames: new Set<string>()
      } satisfies IpAccumulator);

    item.usernames.add(username);

    if (outcome === "blocked") {
      item.blocked += 1;
    } else {
      item.failures += 1;
    }

    if (createdAt > item.lastSeenAt) {
      item.lastSeenAt = createdAt;
    }

    ipMap.set(ip, item);
  }

  private toUserStat(item: UserAccumulator): LoginRiskDailyUserStat {
    const attempts = item.failures + item.blocked;

    return {
      attempts,
      blocked: item.blocked,
      failures: item.failures,
      lastSeenAt: item.lastSeenAt,
      riskScore: item.failures + item.blocked * RISK_BLOCKED_WEIGHT,
      username: item.username
    };
  }

  private toIpStat(item: IpAccumulator): LoginRiskDailyIpStat {
    const attempts = item.failures + item.blocked;

    return {
      attempts,
      blocked: item.blocked,
      failures: item.failures,
      ip: item.ip,
      lastSeenAt: item.lastSeenAt,
      riskScore: item.failures + item.blocked * RISK_BLOCKED_WEIGHT,
      uniqueUsernames: item.usernames.size
    };
  }

  private compareRiskSubjects(
    left: {
      attempts: number;
      lastSeenAt: Date;
      riskScore: number;
    },
    right: {
      attempts: number;
      lastSeenAt: Date;
      riskScore: number;
    },
    leftKey: string,
    rightKey: string
  ) {
    return (
      right.riskScore - left.riskScore ||
      right.attempts - left.attempts ||
      right.lastSeenAt.getTime() - left.lastSeenAt.getTime() ||
      leftKey.localeCompare(rightKey)
    );
  }

  private getUtcDayStart(date: Date | string) {
    const value =
      typeof date === "string" ? new Date(`${date}T00:00:00.000Z`) : date;

    return new Date(
      Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate())
    );
  }

  private toDateKey(date: Date) {
    return date.toISOString().slice(0, 10);
  }

  private toRecord(stat: PersistedDailyStat) {
    return {
      abnormalIps: stat.abnormalIps.map((item) => this.toIpStatRecord(item)),
      date: stat.date,
      generatedAt: new Date(stat.generatedAt).toISOString(),
      lockedUsers: stat.lockedUsers.map((item) =>
        this.toUserStatRecord(item)
      ),
      topFailedUsers: stat.topFailedUsers.map((item) =>
        this.toUserStatRecord(item)
      ),
      totals: stat.totals,
      windowEnd: new Date(stat.windowEnd).toISOString(),
      windowStart: new Date(stat.windowStart).toISOString()
    };
  }

  private toUserStatRecord(item: PersistedUserStat) {
    return {
      attempts: item.attempts,
      blocked: item.blocked,
      failures: item.failures,
      lastSeenAt: new Date(item.lastSeenAt).toISOString(),
      riskScore: item.riskScore,
      username: item.username
    };
  }

  private toIpStatRecord(item: PersistedIpStat) {
    return {
      attempts: item.attempts,
      blocked: item.blocked,
      failures: item.failures,
      ip: item.ip,
      lastSeenAt: new Date(item.lastSeenAt).toISOString(),
      riskScore: item.riskScore,
      uniqueUsernames: item.uniqueUsernames
    };
  }
}
