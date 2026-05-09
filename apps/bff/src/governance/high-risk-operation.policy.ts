export type ApprovalState = "approved" | "cancelled" | "pending" | "rejected";

export type HighRiskOperationCode =
  | "commodity.delete"
  | "commodity.restore"
  | "commodity.status_change"
  | "role.permissions.bind"
  | "user.roles.bind";

export type HighRiskOperationPolicy = {
  approvalReserved: boolean;
  code: HighRiskOperationCode;
  description: string;
  requiresReason: boolean;
  requiresSecondConfirmation: boolean;
};

export const highRiskOperationPolicies: Record<
  HighRiskOperationCode,
  HighRiskOperationPolicy
> = {
  "commodity.delete": {
    approvalReserved: true,
    code: "commodity.delete",
    description: "删除会改变商品可见性，后续可升级为上级审批后执行。",
    requiresReason: true,
    requiresSecondConfirmation: true
  },
  "commodity.restore": {
    approvalReserved: true,
    code: "commodity.restore",
    description: "恢复会重新暴露已删除商品，后续可升级为商品负责人审批。",
    requiresReason: true,
    requiresSecondConfirmation: true
  },
  "commodity.status_change": {
    approvalReserved: true,
    code: "commodity.status_change",
    description: "上下架影响用户可见商品，后续可升级为运营审核流。",
    requiresReason: true,
    requiresSecondConfirmation: false
  },
  "role.permissions.bind": {
    approvalReserved: true,
    code: "role.permissions.bind",
    description: "角色权限影响一组用户能力，后续应由安全管理员审批。",
    requiresReason: true,
    requiresSecondConfirmation: true
  },
  "user.roles.bind": {
    approvalReserved: true,
    code: "user.roles.bind",
    description: "用户角色影响单个账号权限，后续应由账号管理员审批。",
    requiresReason: true,
    requiresSecondConfirmation: true
  }
};

export function listApprovalFlowCandidates() {
  return Object.values(highRiskOperationPolicies).filter(
    (policy) => policy.approvalReserved
  );
}
