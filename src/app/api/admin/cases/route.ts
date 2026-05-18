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

export async function GET(req: NextRequest) {
  try {
    const { admin } = await authenticateAdmin(req);
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') as any || undefined;

    const cases = await caseService.listCases(status);
    return NextResponse.json(cases);
  } catch (error: any) {
    const status = error.message === 'Unauthorized' ? 401 : error.message === 'Forbidden' ? 403 : 500;
    return NextResponse.json({ error: error.message || 'Failed to list cases' }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { admin } = await authenticateAdmin(req);
    const body = await req.json();

    const { type, priority, severity, slaHours, linkedEntities, title, description, ownerAdminId } = body;

    if (!type || !priority || !severity || !title || !description) {
      return NextResponse.json({ error: 'Missing required case fields' }, { status: 400 });
    }

    const slaDueAt = new Date(Date.now() + (slaHours || 48) * 60 * 60 * 1000);

    const caseId = await caseService.openCase(
      {
        type,
        priority,
        severity,
        slaDueAt,
        linkedEntities: linkedEntities || [],
        title,
        description,
        ownerAdminId
      },
      {
        id: admin.id,
        name: admin.name || admin.email || 'Admin',
        email: admin.email
      }
    );

    return NextResponse.json({ caseId }, { status: 201 });
  } catch (error: any) {
    const status = error.message === 'Unauthorized' ? 401 : error.message === 'Forbidden' ? 403 : 500;
    return NextResponse.json({ error: error.message || 'Failed to create case' }, { status });
  }
}
