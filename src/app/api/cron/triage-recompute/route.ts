import { NextRequest, NextResponse } from 'next/server';
import { caseQueueRepository } from '@/domains/cases/case-queue.repository';

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

    await caseQueueRepository.materializeQueue();

    return NextResponse.json({
      success: true,
      message: 'Triage queue materialized successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to recompute triage queue' }, { status: 500 });
  }
}
