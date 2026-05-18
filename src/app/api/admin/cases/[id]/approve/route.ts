import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/infrastructure/firebase/admin';
import { userService } from '@/domains/users/user.service';
import { caseService } from '@/domains/cases/case.service';
import { AdminRole } from '@/lib/security/rbac';
import { User } from '@/lib/types';

export const dynamic = 'force-dynamic';

function getAdminSubRole(admin: User): AdminRole {
  const subRoles: AdminRole[] = ['support_agent', 'risk_analyst', 'finance_ops', 'compliance_manager', 'platform_admin', 'super_admin'];
  const matched = admin.roles?.find((r: any) => subRoles.includes(r as AdminRole)) as AdminRole | undefined;
  return matched || (admin.roles?.includes('Admin') ? 'super_admin' : 'support_agent');
}

async function authenticateAdmin(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Unauthorized');
  }

  const idToken = authHeader.split('Bearer ')[1];
  const adminAuth = getAdminAuth();
  const decodedToken = await adminAuth.verifyIdToken(idToken);
  const admin = await userService.getProfile(decodedToken.uid);

  const hasAdminPrivilege = admin.roles?.includes('Admin') || 
                            admin.roles?.some(r => ['support_agent', 'risk_analyst', 'finance_ops', 'compliance_manager', 'platform_admin', 'super_admin'].includes(r));

  if (!hasAdminPrivilege) {
    throw new Error('Forbidden');
  }

  return { admin, role: getAdminSubRole(admin) };
}

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const { admin, role } = await authenticateAdmin(req);
    const caseId = params.id;
    const body = await req.json();
    const { approvalId, decision } = body;

    if (!approvalId || !decision) {
      return NextResponse.json({ error: 'Missing approvalId or decision' }, { status: 400 });
    }

    if (decision !== 'approved' && decision !== 'rejected') {
      return NextResponse.json({ error: 'Decision must be approved or rejected' }, { status: 400 });
    }

    await caseService.processApproval(caseId, approvalId, decision, {
      id: admin.id,
      name: admin.name || admin.email || 'Admin',
      email: admin.email,
      role
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    const status = error.message === 'Unauthorized' ? 401 : error.message === 'Forbidden' ? 403 : 500;
    return NextResponse.json({ error: error.message || 'Failed to process approval' }, { status });
  }
}
