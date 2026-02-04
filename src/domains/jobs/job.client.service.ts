
import { doc, onSnapshot, collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Job } from '@/lib/types';
import { Unsubscribe } from 'firebase/auth';

/**
 * Client-Side Job Service
 * Handles real-time subscriptions and client-side Firestore interactions.
 * This keeps hooks clean and logic isolated.
 */
export const jobClientService = {
    /**
     * Subscribe to a single job's updates
     */
    subscribeToJob(jobId: string, onUpdate: (job: Job | null) => void, onError: (error: Error) => void): Unsubscribe {
        const unsubscribe = onSnapshot(
            doc(db, 'jobs', jobId),
            (docSnapshot) => {
                if (docSnapshot.exists()) {
                    onUpdate({ id: docSnapshot.id, ...docSnapshot.data() } as Job);
                } else {
                    onUpdate(null);
                }
            },
            (error) => {
                console.error('Error in job subscription:', error);
                onError(error);
            }
        );
        return unsubscribe;
    },

    /**
     * Subscribe to bids for a job
     */
    subscribeToBids(jobId: string, onUpdate: (bids: any[]) => void, onError: (error: Error) => void): Unsubscribe {
        const bidsRef = collection(db, 'jobs', jobId, 'bids');
        const q = query(bidsRef, orderBy('amount', 'asc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedBids = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            onUpdate(fetchedBids);
        }, (error) => {
            console.error('Error in bids subscription:', error);
            onError(error);
        });
        return unsubscribe;
    },
};
