import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/infrastructure/firebase/admin';
import { userService } from '@/domains/users/user.service';
import { getAdminDb } from '@/infrastructure/firebase/admin';
import { AdminRole } from '@/lib/security/rbac';
import { User } from '@/lib/types';
import { Timestamp } from 'firebase-admin/firestore';

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
    const db = getAdminDb();

    // Query transactions from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const snapshot = await db.collection('transactions')
      .where('createdAt', '>=', Timestamp.fromDate(thirtyDaysAgo))
      .get();

    let totalFunded = 0;
    let totalReleased = 0;
    let totalRefunded = 0;
    let totalPayerFees = 0;
    let totalPlatformCommissions = 0;

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const status = data.status || '';
      
      if (status === 'funded') {
        totalFunded += data.totalPaidByClient || 0;
        totalPlatformCommissions += data.commission || 0;
        totalPayerFees += data.clientFee || 0;
      } else if (status === 'released') {
        totalReleased += data.payoutToProfessional || 0;
        totalPlatformCommissions += data.commission || 0;
        totalPayerFees += data.clientFee || 0;
      } else if (status === 'refunded') {
        totalRefunded += data.totalPaidByClient || 0;
      }
    });

    const exceptionsSnap = await db.collection('financial_exceptions')
      .where('status', '==', 'open')
      .get();

    const mismatchCount = exceptionsSnap.size;

    return NextResponse.json({
      summary: {
        totalFunded,
        totalReleased,
        totalRefunded,
        netCashflow: totalFunded - totalReleased - totalRefunded,
        revenue: totalPlatformCommissions + totalPayerFees,
        mismatchCount
      },
      duration: 'Last 30 days',
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    const status = error.message === 'Unauthorized' ? 401 : error.message === 'Forbidden' ? 403 : 500;
    return NextResponse.json({ error: error.message || 'Failed to generate reconciliation summary' }, { status });
  }
}
