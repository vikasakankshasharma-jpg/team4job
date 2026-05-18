import { randomUUID } from 'crypto';
import type { PlatformEvent } from './event-types';

export type EventHandler = (event: PlatformEvent) => Promise<void> | void;

export class EventEmitterService {
  private handlers: EventHandler[] = [];

  subscribe(handler: EventHandler) {
    this.handlers.push(handler);
  }

  emit(event: PlatformEvent) {
    const hydrated: PlatformEvent = {
      ...event,
      correlationId: event.correlationId ?? randomUUID(),
      occurredAt: event.occurredAt || new Date().toISOString(),
    };

    for (const handler of this.handlers) {
      void Promise.resolve().then(() => handler(hydrated));
    }
  }
}

export const platformEventEmitter = new EventEmitterService();

// Register background consumers & linkers to prevent cold-start circular dependencies
if (typeof window === 'undefined') {
  void import('@/domains/cases/dispute-case-linker').catch(() => {});
  void import('@/domains/analytics/analytics.consumer').catch(() => {});
  void import('@/domains/notifications/notification.consumer').catch(() => {});
  void import('@/domains/risk/risk.consumer').catch(() => {});
}
