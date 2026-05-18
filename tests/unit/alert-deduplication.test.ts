import { AlertDeduplicator } from '@/lib/alerts/alert-deduplication';

describe('alert dedupe', () => {
  it('suppresses duplicate alerts in same bucket', () => {
    const dedup = new AlertDeduplicator();
    const alert = { type: 'a', entityId: '1', severity: 'WARNING' as const, timestampMs: 1_000 };

    expect(dedup.shouldEmit(alert)).toBe(true);
    expect(dedup.shouldEmit(alert)).toBe(false);
  });
});
