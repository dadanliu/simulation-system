import { LoginRiskDailyStatService } from "./login-risk-daily-stat.service";

function createQueryChain<T>(value: T) {
  return {
    lean: jest.fn().mockResolvedValue(value),
    limit: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis()
  };
}

describe("LoginRiskDailyStatService", () => {
  it("generates daily risk stats from login audit logs", async () => {
    const auditFindChain = createQueryChain([
      {
        createdAt: "2026-05-21T01:00:00.000Z",
        ip: "10.0.0.1",
        outcome: "failure",
        username: "Admin"
      },
      {
        createdAt: "2026-05-21T02:00:00.000Z",
        ip: "10.0.0.1",
        outcome: "blocked",
        username: "admin"
      },
      {
        createdAt: "2026-05-21T03:00:00.000Z",
        ip: "10.0.0.2",
        outcome: "success",
        username: "ops"
      },
      {
        createdAt: "2026-05-21T04:00:00.000Z",
        ip: "10.0.0.1",
        outcome: "failure",
        username: "root"
      },
      {
        createdAt: "2026-05-21T05:00:00.000Z",
        ip: "10.0.0.3",
        outcome: "failure",
        username: "root"
      }
    ]);
    const auditLogModel = {
      find: jest.fn().mockReturnValue(auditFindChain)
    };
    const statModel = {
      findOneAndUpdate: jest.fn((_filter, update) => ({
        lean: jest.fn().mockResolvedValue(update.$set)
      }))
    };
    const service = new LoginRiskDailyStatService(
      statModel as never,
      auditLogModel as never
    );

    const result = await service.generateForDate("2026-05-21");

    expect(auditLogModel.find).toHaveBeenCalledWith({
      createdAt: {
        $gte: new Date("2026-05-21T00:00:00.000Z"),
        $lt: new Date("2026-05-22T00:00:00.000Z")
      }
    });
    expect(statModel.findOneAndUpdate).toHaveBeenCalledWith(
      { date: "2026-05-21" },
      expect.objectContaining({
        $set: expect.objectContaining({
          date: "2026-05-21"
        })
      }),
      { new: true, setDefaultsOnInsert: true, upsert: true }
    );
    expect(result.totals).toEqual({
      attempts: 5,
      blocked: 1,
      failure: 3,
      success: 1,
      uniqueIps: 3,
      uniqueUsernames: 3
    });
    expect(result.topFailedUsers[0]).toEqual({
      attempts: 2,
      blocked: 1,
      failures: 1,
      lastSeenAt: "2026-05-21T02:00:00.000Z",
      riskScore: 6,
      username: "admin"
    });
    expect(result.lockedUsers).toHaveLength(1);
    expect(result.abnormalIps[0]).toEqual({
      attempts: 3,
      blocked: 1,
      failures: 2,
      ip: "10.0.0.1",
      lastSeenAt: "2026-05-21T04:00:00.000Z",
      riskScore: 7,
      uniqueUsernames: 2
    });
  });

  it("lists saved daily stats with date filters and pagination", async () => {
    const savedStat = {
      abnormalIps: [],
      date: "2026-05-21",
      generatedAt: new Date("2026-05-22T00:05:00.000Z"),
      lockedUsers: [],
      topFailedUsers: [],
      totals: {
        attempts: 0,
        blocked: 0,
        failure: 0,
        success: 0,
        uniqueIps: 0,
        uniqueUsernames: 0
      },
      windowEnd: new Date("2026-05-22T00:00:00.000Z"),
      windowStart: new Date("2026-05-21T00:00:00.000Z")
    };
    const statFindChain = createQueryChain([savedStat]);
    const statModel = {
      countDocuments: jest.fn().mockResolvedValue(1),
      find: jest.fn().mockReturnValue(statFindChain)
    };
    const service = new LoginRiskDailyStatService(
      statModel as never,
      {} as never
    );

    const result = await service.listStats({
      dateFrom: "2026-05-01",
      dateTo: "2026-05-21",
      page: 2,
      pageSize: 5
    });

    expect(statModel.find).toHaveBeenCalledWith({
      date: {
        $gte: "2026-05-01",
        $lte: "2026-05-21"
      }
    });
    expect(statFindChain.sort).toHaveBeenCalledWith({ date: -1 });
    expect(statFindChain.skip).toHaveBeenCalledWith(5);
    expect(statFindChain.limit).toHaveBeenCalledWith(5);
    expect(result).toEqual({
      list: [
        {
          abnormalIps: [],
          date: "2026-05-21",
          generatedAt: "2026-05-22T00:05:00.000Z",
          lockedUsers: [],
          topFailedUsers: [],
          totals: savedStat.totals,
          windowEnd: "2026-05-22T00:00:00.000Z",
          windowStart: "2026-05-21T00:00:00.000Z"
        }
      ],
      pagination: {
        page: 2,
        pageSize: 5,
        total: 1
      }
    });
  });
});
