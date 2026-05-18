import { EventEmitterService } from '@/lib/events/event-emitter';

describe('event emitter', () => {
  it('hydrates correlation id and emits async', async () => {
    const emitter = new EventEmitterService();
    const calls: string[] = [];

    emitter.subscribe((event) => {
      if (event.correlationId) calls.push(event.correlationId);
    });

    emitter.emit({ name: 'job.created', occurredAt: '', payload: { id: 'x' } });
    await new Promise((r) => setTimeout(r, 10));

    expect(calls.length).toBe(1);
  });
});
