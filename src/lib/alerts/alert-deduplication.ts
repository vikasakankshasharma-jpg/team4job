export interface AlertEvent {
  type: string;
  entityId: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  timestampMs: number;
}

const WINDOW_MS = 5 * 60 * 1000;

export class AlertDeduplicator {
  private readonly seen = new Map<string, number>();

  shouldEmit(alert: AlertEvent): boolean {
    const bucket = Math.floor(alert.timestampMs / WINDOW_MS);
    const key = `${alert.type}:${alert.entityId}:${alert.severity}:${bucket}`;
    const existing = this.seen.get(key);

    if (existing) return false;

    this.seen.set(key, alert.timestampMs);
    return true;
  }
}

const globalDeduplicator = new AlertDeduplicator();

export async function deduplicateAlert(
  level: 'INFO' | 'WARNING' | 'CRITICAL',
  message: string,
  metadata?: any
): Promise<boolean> {
  const entityId = metadata?.jobId || metadata?.disputeId || metadata?.userId || message;
  const alert: AlertEvent = {
    type: message,
    entityId: String(entityId),
    severity: level,
    timestampMs: Date.now(),
  };
  // Returns true if duplicate (i.e., we should NOT emit)
  return !globalDeduplicator.shouldEmit(alert);
}

