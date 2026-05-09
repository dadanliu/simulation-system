import type { MockCommodity } from "./commodity.service";

export type CommodityStatus = MockCommodity["status"];

export type CommodityStatusTransitionRule = {
  code: number;
  from: CommodityStatus;
  message: string;
  to: CommodityStatus;
};

export const commodityStatusTransitionRules: CommodityStatusTransitionRule[] = [
  {
    code: 20011,
    from: "pending",
    message: "pending commodity can only be approved to on_sale",
    to: "on_sale"
  },
  {
    code: 20012,
    from: "on_sale",
    message: "on_sale commodity can only be taken offline",
    to: "offline"
  }
];

export function isCommodityStatus(
  value: string | undefined
): value is CommodityStatus {
  return value === "on_sale" || value === "pending" || value === "offline";
}

export function getNextCommodityStatusOptions(status: CommodityStatus) {
  return commodityStatusTransitionRules
    .filter((rule) => rule.from === status)
    .map((rule) => rule.to);
}

export function validateCommodityStatusTransition(
  from: CommodityStatus,
  to: CommodityStatus
) {
  const matchedRule = commodityStatusTransitionRules.find(
    (rule) => rule.from === from && rule.to === to
  );

  if (matchedRule) {
    return {
      ok: true as const
    };
  }

  const firstAvailableRule = commodityStatusTransitionRules.find(
    (rule) => rule.from === from
  );

  return {
    code: firstAvailableRule?.code ?? 20013,
    message:
      firstAvailableRule?.message ??
      "offline commodity cannot change status directly",
    ok: false as const
  };
}
