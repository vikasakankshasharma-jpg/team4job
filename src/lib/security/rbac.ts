export type AdminRole =
  | 'support_agent'
  | 'risk_analyst'
  | 'finance_ops'
  | 'compliance_manager'
  | 'platform_admin'
  | 'super_admin';

export type AdminAction =
  | 'dispute.review'
  | 'dispute.resolve'
  | 'user.view_pii'
  | 'user.sanction'
  | 'refund.process'
  | 'payout.approve'
  | 'feature_flag.update'
  | 'case.view'
  | 'case.assign'
  | 'case.resolve'
  | 'case.approve_high_risk'
  | 'audit.verify_chain';

export interface AccessContext {
  amountInr?: number;
  requiresStepUp?: boolean;
}

const PERMISSIONS: Record<AdminRole, AdminAction[]> = {
  support_agent: ['dispute.review', 'case.view'],
  risk_analyst: ['dispute.review', 'dispute.resolve', 'user.view_pii', 'case.view', 'case.assign', 'case.resolve'],
  finance_ops: ['refund.process', 'payout.approve', 'dispute.review', 'case.view', 'case.resolve'],
  compliance_manager: ['user.view_pii', 'user.sanction', 'dispute.resolve', 'case.view', 'case.assign', 'case.resolve', 'case.approve_high_risk', 'audit.verify_chain'],
  platform_admin: ['dispute.review', 'dispute.resolve', 'user.view_pii', 'feature_flag.update', 'case.view', 'case.assign', 'case.resolve'],
  super_admin: [
    'dispute.review',
    'dispute.resolve',
    'user.view_pii',
    'user.sanction',
    'refund.process',
    'payout.approve',
    'feature_flag.update',
    'case.view',
    'case.assign',
    'case.resolve',
    'case.approve_high_risk',
    'audit.verify_chain',
  ],
};

export interface AccessDecision {
  allowed: boolean;
  reason?: string;
  requiresStepUp: boolean;
}

export function checkAdminAccess(
  role: AdminRole,
  action: AdminAction,
  context: AccessContext = {}
): AccessDecision {
  if (!PERMISSIONS[role].includes(action)) {
    return { allowed: false, reason: 'role_not_permitted', requiresStepUp: false };
  }

  if (role === 'finance_ops' && action === 'refund.process' && (context.amountInr ?? 0) > 10_000) {
    return { allowed: false, reason: 'refund_limit_exceeded', requiresStepUp: true };
  }

  if (role === 'finance_ops' && action === 'payout.approve' && (context.amountInr ?? 0) > 25_000) {
    return { allowed: false, reason: 'payout_limit_exceeded', requiresStepUp: true };
  }

  const requiresStepUp = Boolean(
    context.requiresStepUp ||
      ['user.sanction', 'refund.process', 'payout.approve'].includes(action)
  );
  return { allowed: true, requiresStepUp };
}
