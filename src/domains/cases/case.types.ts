import { Timestamp } from 'firebase-admin/firestore';
import { SchemaEnvelope } from '@/lib/schema/schema-envelope';

export type CaseType = 'dispute' | 'refund' | 'risk_alert' | 'payout_mismatch' | 'compliance';

export type CaseStatus = 'open' | 'under_review' | 'pending_review' | 'closed';

export type CasePriority = 'low' | 'medium' | 'high' | 'critical';

export type CaseSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface LinkedEntity {
  type: 'job' | 'dispute' | 'transaction' | 'user';
  id: string;
}

export type TimelineEntryType =
  | 'created'
  | 'status_changed'
  | 'assigned'
  | 'approval_requested'
  | 'approved'
  | 'rejected'
  | 'note_added'
  | 'evidence_attached';

export interface CaseTimelineEntry {
  id: string;
  type: TimelineEntryType;
  actorId: string;
  actorName: string;
  timestamp: Timestamp | Date;
  details: Record<string, any>;
}

export interface CaseApproval {
  id: string;
  requesterId: string;
  requesterName: string;
  approverId?: string;
  approverName?: string;
  reason: string;
  result?: 'approved' | 'rejected';
  requestedAt: Timestamp | Date;
  decidedAt?: Timestamp | Date;
  details?: Record<string, any>;
}

export interface Case extends SchemaEnvelope {
  id: string;
  type: CaseType;
  status: CaseStatus;
  priority: CasePriority;
  severity: CaseSeverity;
  ownerAdminId?: string;
  watcherIds: string[];
  slaDueAt: Timestamp | Date;
  openedAt: Timestamp | Date;
  closedAt?: Timestamp | Date;
  linkedEntities: LinkedEntity[];
  riskScore: number;
  amountAtRisk: number;
  timeline: CaseTimelineEntry[];
  approvals: CaseApproval[];
  title: string;
  description: string;
}

export interface CreateCaseInput {
  type: CaseType;
  priority: CasePriority;
  severity: CaseSeverity;
  slaDueAt: Date;
  linkedEntities: LinkedEntity[];
  riskScore?: number;
  amountAtRisk?: number;
  title: string;
  description: string;
  ownerAdminId?: string;
}
