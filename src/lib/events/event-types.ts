export type PlatformEventName =
  | 'job.created'
  | 'bid.placed'
  | 'job.awarded'
  | 'escrow.funded'
  | 'dispute.opened'
  | 'dispute.resolved'
  | 'review.submitted'
  | 'user.flagged';

export interface PlatformEvent<TPayload = Record<string, unknown>> {
  name: PlatformEventName;
  occurredAt: string;
  payload: TPayload;
  correlationId?: string;
}
