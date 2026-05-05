import type { CommodityStatus } from "@/src/features/commodity/types";

export type CommodityStatusTransitionRule = {
  from: CommodityStatus;
  label: string;
  to: CommodityStatus;
};

export const commodityStatusTransitionRules: CommodityStatusTransitionRule[] = [
  {
    from: "pending",
    label: "审核通过并上架",
    to: "on_sale"
  },
  {
    from: "on_sale",
    label: "下架商品",
    to: "offline"
  }
];

export function getNextCommodityStatusOptions(status: CommodityStatus) {
  return commodityStatusTransitionRules
    .filter((rule) => rule.from === status)
    .map((rule) => ({
      label: rule.label,
      value: rule.to
    }));
}
