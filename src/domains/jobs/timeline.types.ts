import { Timestamp } from 'firebase/firestore';

export type JobEventType = 
  | 'JOB_CREATED'
  | 'JOB_UPDATED'
  | 'JOB_CANCELLED'
  | 'JOB_CLOSED'
  
  | 'BID_PLACED'
  | 'BID_UPDATED'
  | 'BID_WITHDRAWN'
  | 'BID_AWARDED'
  | 'BID_REJECTED'
  
  | 'FUNDING_INITIATED'
  | 'FUNDING_COMPLETED'
  | 'FUNDING_FAILED'
  
  | 'WORK_STARTED'
  | 'WORK_PAUSED'
  | 'WORK_RESUMED'
  
  | 'EVIDENCE_UPLOADED'
  | 'WORK_COMPLETED'
  
  | 'CUSTOMER_APPROVED'
  | 'CUSTOMER_REJECTED'
  
  | 'PAYMENT_RELEASED'
  | 'REFUND_INITIATED'
  | 'REFUND_COMPLETED'
  
  | 'DISPUTE_OPENED'
  | 'DISPUTE_RESOLVED'
  
  | 'ADMIN_ACTION'
  | 'SYSTEM_EVENT';

export interface JobEvent {
  id?: string;
  jobId: string;
  eventType: JobEventType;
  actorId: string;
  actorRole: 'CUSTOMER' | 'PROFESSIONAL' | 'ADMIN' | 'SYSTEM';
  timestamp: Date | Timestamp;
  metadata: Record<string, any>;
  visibility: ('CUSTOMER' | 'PROFESSIONAL' | 'ADMIN')[];
  idempotencyKey?: string;
}
