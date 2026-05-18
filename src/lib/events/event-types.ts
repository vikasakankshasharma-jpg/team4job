export type PlatformEventName =
  | 'job.created'
  | 'bid.placed'
  | 'job.awarded'
  | 'escrow.funded'
  | 'dispute.opened'
  | 'dispute.resolved'
  | 'review.submitted'
  | 'user.flagged'
  | 'case.opened'
  | 'case.closed'
  | 'case.approval_requested'
  | 'case.approved'
  | 'case.rejected'
  | 'refund.requested';

export interface PlatformEvent<TPayload = Record<string, unknown>> {
  name: PlatformEventName;
  occurredAt: string;
  payload: TPayload;
  correlationId?: string;
}
