"use client";

import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Bid } from '@/lib/types';

export function useBidsSubscription(jobId: string, initialData?: Bid[]) {
    const [bids, setBids] = useState<Bid[]>(initialData || []);
    const [loading, setLoading] = useState(!initialData);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!jobId) {
            setLoading(false);
            return;
        }

        const bidsRef = collection(db, 'jobs', jobId, 'bids');
        const q = query(bidsRef, orderBy('amount', 'asc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedBids = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Bid));
            setBids(fetchedBids);
            setLoading(false);
        }, (err) => {
            console.error("Error fetching bids:", err);
            setError(err);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [jobId]);

    return { bids, loading, error };
}
