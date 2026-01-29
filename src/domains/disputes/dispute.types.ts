
import { Timestamp } from 'firebase-admin/firestore';
import { Role } from '@/lib/types';

export interface DisputeMessage {
    authorId: string;
    authorRole: Role;
    content: string;
    timestamp: Date | Timestamp;
    attachments?: any[];
}

export interface Dispute {
    id: string;
    requesterId: string;
    category: "Job Dispute" | "Billing Inquiry" | "Technical Support" | "Skill Request" | "General Question";
    title: string;
    jobId?: string;
    jobTitle?: string;
    status: 'Open' | 'Under Review' | 'Resolved';
    reason: string;
    parties?: {
        jobGiverId: string;
        installerId: string;
    };
    messages: DisputeMessage[];
    resolution?: string;
    createdAt: Date | Timestamp;
    resolvedAt?: Date | Timestamp;
    handledBy?: string;
}

export interface CreateDisputeInput {
    requesterId: string;
    category: Dispute['category'];
    title: string;
    reason: string;
    jobId?: string;
    jobTitle?: string;
    parties?: Dispute['parties'];
}
