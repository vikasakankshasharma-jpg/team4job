// domains/bids/bid.repository.ts

import { getAdminDb } from '@/infrastructure/firebase/admin';
import { COLLECTIONS } from '@/infrastructure/firebase/firestore';
import { logger } from '@/infrastructure/logger';
import { Bid } from './bid.types';
import { Timestamp } from 'firebase-admin/firestore';

/**
 * Bid Repository - Data access for bids
 * Note: Bids are stored as subcollections under jobs
 */
export class BidRepository {
    /**
     * Create a bid as a subcollection of a job
     */
    async create(jobId: string, bid: Partial<Bid>): Promise<string> {
        try {
            const db = getAdminDb();
            const bidRef = await db
                .collection(COLLECTIONS.JOBS)
                .doc(jobId)
                .collection('bids')
                .add({
                    ...bid,
                    timestamp: Timestamp.now(),
                });

            logger.info('Bid created', { jobId, bidId: bidRef.id });
            return bidRef.id;
        } catch (error) {
            logger.error('Failed to create bid', error, { metadata: { jobId } });
            throw error;
        }
    }

    /**
     * Get all bids for a job
     */
    async fetchByJob(jobId: string): Promise<Bid[]> {
        try {
            const db = getAdminDb();
            const snapshot = await db
                .collection(COLLECTIONS.JOBS)
                .doc(jobId)
                .collection('bids')
                .orderBy('timestamp', 'desc')
                .get();

            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Bid));
        } catch (error) {
            logger.error('Failed to fetch bids', error, { metadata: { jobId } });
            throw error;
        }
    }

    /**
     * Delete a bid
     */
    async delete(jobId: string, bidId: string): Promise<void> {
        try {
            const db = getAdminDb();
            await db
                .collection(COLLECTIONS.JOBS)
                .doc(jobId)
                .collection('bids')
                .doc(bidId)
                .delete();

            logger.info('Bid deleted', { jobId, bidId });
        } catch (error) {
            logger.error('Failed to delete bid', error, { metadata: { jobId, bidId } });
            throw error;
        }
    }
}

export const bidRepository = new BidRepository();
