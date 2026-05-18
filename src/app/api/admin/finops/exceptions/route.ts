import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/infrastructure/firebase/admin';
import { userService } from '@/domains/users/user.service';
import { financialExceptionService } from '@/domains/finops/financial-exception.service';
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

export async function GET(req: NextRequest) {
  try {
    await authenticateAdmin(req);
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') as any || undefined;

    const exceptions = await financialExceptionService.listExceptions(status);
    return NextResponse.json(exceptions);
  } catch (error: any) {
    const status = error.message === 'Unauthorized' ? 401 : error.message === 'Forbidden' ? 403 : 500;
    return NextResponse.json({ error: error.message || 'Failed to list exceptions' }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    await authenticateAdmin(req);
    const body = await req.json();
    const { type, transactionId, amountExpected, amountActual, notes } = body;

    if (!type || !transactionId || amountExpected === undefined || amountActual === undefined) {
      return NextResponse.json({ error: 'Missing required exception fields' }, { status: 400 });
    }

    const exceptionId = await financialExceptionService.raiseException({
      type,
      transactionId,
      amountExpected,
      amountActual,
      notes
    });

    return NextResponse.json({ exceptionId }, { status: 201 });
  } catch (error: any) {
    const status = error.message === 'Unauthorized' ? 401 : error.message === 'Forbidden' ? 403 : 500;
    return NextResponse.json({ error: error.message || 'Failed to raise exception' }, { status });
  }
}
