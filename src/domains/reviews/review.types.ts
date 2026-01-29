
import { Timestamp } from 'firebase-admin/firestore';
import { Role } from '@/lib/types';

export interface Review {
    id: string;
    jobId: string;
    reviewerId: string;
    targetUserId: string;
    rating: number; // 1-5
    comment: string;
    role: 'Job Giver' | 'Installer';
    createdAt: Date | Timestamp;
}

export interface CreateReviewInput {
    jobId: string;
    reviewerId: string;
    targetUserId: string;
    rating: number;
    comment?: string;
    role: 'Job Giver' | 'Installer';
}
