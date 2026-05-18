import { checkAdminAccess } from '@/lib/security/rbac';

describe('rbac', () => {
  it('blocks finance_ops refund over threshold', () => {
    const result = checkAdminAccess('finance_ops', 'refund.process', { amountInr: 15000 });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('refund_limit_exceeded');
  });

  it('allows super admin for sanctions', () => {
    const result = checkAdminAccess('super_admin', 'user.sanction');
    expect(result.allowed).toBe(true);
  });
});
