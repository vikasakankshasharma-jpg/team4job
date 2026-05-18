import { NextRequest, NextResponse } from 'next/server';
import { caseQueueRepository } from '@/domains/cases/case-queue.repository';
import { logAdminAction } from '@/lib/admin-logger';
import { checkAdminAccess, type AdminRole } from '@/lib/security/rbac';

export async function GET(req: NextRequest) {
  try {
    const limit = Number(req.nextUrl.searchParams.get('limit') ?? 50);
    const data = await caseQueueRepository.getQueue(limit);
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Queue GET error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const adminId = body.adminId;
    const role = body.role as AdminRole;

    if (!adminId || !role) {
      return NextResponse.json({ error: 'Missing adminId or role' }, { status: 400 });
    }

    // RBAC check
    const decision = checkAdminAccess(role, 'dispute.review');
    if (!decision.allowed) {
      return NextResponse.json({ error: 'Forbidden', reason: decision.reason }, { status: 403 });
    }

    const claimedCase = await caseQueueRepository.claimNext(adminId, role);

    if (!claimedCase) {
      return NextResponse.json({ message: 'No available cases to claim' }, { status: 404 });
    }

    // Audit Log for tamper-evident chain
    await logAdminAction({
      adminId,
      adminName: adminId, // Fallback if name is missing
      adminEmail: '',
      actionType: 'SETTINGS_CHANGED', // Using SETTINGS_CHANGED as a general case mutate for now
      targetType: 'settings', // Generic targetType for case manipulation
      targetId: claimedCase.id,
      details: { caseAction: 'queue_claim', priority: claimedCase.priorityBucket, score: claimedCase.scoreTotal }
    });

    return NextResponse.json({ data: claimedCase }, { status: 200 });
  } catch (error) {
    console.error('Queue Claim error:', error);
    return NextResponse.json({ error: 'Internal Server Error or Contention' }, { status: 500 });
  }
}
