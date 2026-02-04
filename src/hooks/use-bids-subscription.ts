"use client";

import { useEffect, useState } from 'react';
import { jobClientService } from '@/domains/jobs/job.client.service';
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

        const unsubscribe = jobClientService.subscribeToBids(
            jobId,
            (fetchedBids) => {
                setBids(fetchedBids as Bid[]); // Cast to Bid[] as service returns any[] for now or I should update service types
                setLoading(false);
            },
            (err) => {
                setError(err);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [jobId]);

    return { bids, loading, error };
}
