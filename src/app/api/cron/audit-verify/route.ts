import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/infrastructure/firebase/admin';
import { logAdminAlert } from '@/lib/admin-logger';
import { caseService } from '@/domains/cases/case.service';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // SECURITY: Verify cron secret if in production
    if (process.env.NODE_ENV === 'production' || process.env.CRON_SECRET) {
      const authHeader = req.headers.get('Authorization');
      if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const db = getAdminDb();
    
    // Get recent logs ordered by timestamp asc
    const snapshot = await db.collection('admin_action_logs')
      .orderBy('timestamp', 'asc')
      .limit(1000)
      .get();

    if (snapshot.empty) {
      return NextResponse.json({ success: true, message: 'No logs to verify' });
    }

    let previousHash = '0000000000000000000000000000000000000000000000000000000000000000';
    let tampered = false;
    const tamperedLogs: string[] = [];

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const logEntryString = JSON.stringify({
        adminId: data.adminId,
        actionType: data.actionType,
        timestamp: data.timestamp?.seconds || 0,
        targetId: data.targetId || '',
        previousHash,
      });

      const computedHash = crypto.createHash('sha256').update(logEntryString).digest('hex');

      // If a hash was recorded on write, we verify it.
      if (data.hash && data.hash !== computedHash) {
        tampered = true;
        tamperedLogs.push(doc.id);
      }

      previousHash = computedHash;
    }

    if (tampered) {
      // 1. Emit CRITICAL alert
      await logAdminAlert(
        'CRITICAL',
        `AUDIT INTEGRITY COMPROMISED: Tampering detected in admin action logs. Count: ${tamperedLogs.length}`,
        { tamperedLogIds: tamperedLogs }
      );

      // 2. Open critical compliance case
      await caseService.openCase({
        type: 'compliance',
        priority: 'high',
        severity: 'critical',
        slaDueAt: new Date(Date.now() + 12 * 60 * 60 * 1000), // Strict 12-hour response SLA
        linkedEntities: tamperedLogs.map(id => ({ type: 'dispute', id })),
        riskScore: 100,
        amountAtRisk: 0,
        title: 'COMPLIANCE BREACH: Tamper Evident Log Chain Broken',
        description: `Audit integrity chaining failed for ${tamperedLogs.length} log documents. High risk of unauthorized administrative operations.`
      });

      return NextResponse.json({
        verified: false,
        message: 'TAMPERING DETECTED! Compliance case opened.',
        tamperedLogs
      }, { status: 400 });
    }

    return NextResponse.json({
      verified: true,
      count: snapshot.size,
      message: 'Audit log integrity chain is intact.'
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Audit verification failed' }, { status: 500 });
  }
}
