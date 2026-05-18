import { Timestamp } from 'firebase-admin/firestore';
import { SchemaEnvelope } from '@/lib/schema/schema-envelope';

export type ExceptionType =
  | 'payout_mismatch'
  | 'verification_failure'
  | 'refund_above_threshold'
  | 'duplicate_transaction';

export type ExceptionStatus = 'open' | 'under_review' | 'resolved' | 'escalated';

export interface FinancialException extends SchemaEnvelope {
  id: string;
  type: ExceptionType;
  status: ExceptionStatus;
  transactionId: string;
  amountExpected: number;
  amountActual: number;
  detectedAt: Timestamp | Date;
  caseId?: string;
  notes?: string;
  resolvedAt?: Timestamp | Date;
  resolvedBy?: string;
}

export interface CreateExceptionInput {
  type: ExceptionType;
  transactionId: string;
  amountExpected: number;
  amountActual: number;
  notes?: string;
}
