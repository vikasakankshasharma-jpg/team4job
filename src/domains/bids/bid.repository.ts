// domains/bids/bid.repository.ts

import { getAdminDb } from '@/infrastructure/firebase/admin';
import { COLLECTIONS } from '@/infrastructure/firebase/firestore';

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


            return bidRef.id;
        } catch (error) {

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

            throw error;
        }
    }

    /**
     * Get a single bid by ID
     */
    async fetchById(jobId: string, bidId: string): Promise<Bid | null> {
        try {
            const db = getAdminDb();
            const doc = await db
                .collection(COLLECTIONS.JOBS)
                .doc(jobId)
                .collection('bids')
                .doc(bidId)
                .get();

            if (!doc.exists) {
                return null;
            }

            return { id: doc.id, ...doc.data() } as Bid;
        } catch (error) {

            throw error;
        }
    }

    /**
     * Get all bids by an installer with pagination using collectionGroup
     * @param installerId - The installer user ID
     * @param limit - Number of bids per page (default 50)
     * @param lastTimestamp - Cursor for pagination (timestamp of last bid)
     */
    async fetchBidsByInstaller(installerId: string, limit = 50, lastTimestamp?: Date): Promise<Bid[]> {
        try {
            const db = getAdminDb();

            // Use collectionGroup to query across all job subcollections
            let query = db
                .collectionGroup('bids')
                .where('installerId', '==', installerId)
                .orderBy('timestamp', 'desc');

            if (lastTimestamp) {
                query = query.startAfter(Timestamp.fromDate(lastTimestamp));
            }

            const snapshot = await query.limit(limit).get();

            // Extract bids with jobId from document path
            return snapshot.docs.map(doc => {
                // doc.ref.parent.parent gives us the job document
                const jobId = doc.ref.parent.parent?.id || '';
                return {
                    id: doc.id,
                    jobId,
                    ...doc.data()
                } as Bid & { jobId: string };
            });
        } catch (error) {

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


        } catch (error) {

            throw error;
        }
    }
}

export const bidRepository = new BidRepository();
