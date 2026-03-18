// domains/bids/bid.types.ts

import { DocumentReference, Timestamp } from 'firebase/firestore';
import { User } from '@/lib/types';

export interface Bid {
  id?: string;
  jobId: string;
  professional: User | DocumentReference;
  professionalId: string;
  amount: number;
  timestamp: Date | Timestamp;
  clientId?: string;
  coverLetter?: string;
  includedItems?: string[];
  warrantyDuration?: string;
  estimatedDuration?: number;
  durationUnit?: 'Hours' | 'Days';
  status?: 'active' | 'withdrawn' | 'accepted' | 'rejected';
}

export interface CreateBidInput {
  jobId: string;
  amount: number;
  coverLetter?: string;
  includedItems?: string[];
  warrantyDuration?: string;
  estimatedDuration?: number;
  durationUnit?: 'Hours' | 'Days';
}
