import { NextRequest, NextResponse } from 'next/server';
import { caseQueueRepository } from '@/domains/cases/case-queue.repository';
import { triageScoreService } from '@/domains/cases/triage-score.service';
import { caseRepository } from '@/domains/cases/case.repository';

export async function GET(req: NextRequest) {
  // 1. Cron Auth Validation
  const authHeader = req.headers.get('Authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Timestamp Freshness Check (±5 min)
  const timestampStr = req.headers.get('X-Cron-Timestamp');
  if (!timestampStr) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const requestTime = parseInt(timestampStr, 10);
  if (isNaN(requestTime)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = Date.now();
  if (Math.abs(now - requestTime) > 5 * 60 * 1000) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); // Replay risk
  }

  try {
    // 3. Fetch open cases
    const openCases = await caseRepository.listAll(100);
    const activeCases = openCases.filter((c: any) => c.status === 'open' || c.status === 'pending_review');

    // 4. Score them
    const scoredCases = activeCases.map((c: any) => ({
      ...c,
      scoreResult: triageScoreService.computeScore(c as any)
    }));

    // 5. Materialize queue
    await caseQueueRepository.materializeQueue(scoredCases as any);

    return NextResponse.json({ success: true, count: scoredCases.length });
  } catch (error) {
    console.error('Triage recompute failed:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
