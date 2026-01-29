"use client";

import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Job } from '@/lib/types'; // Using UI types for now, or ensure domain/jobs/job.types match
import { useToast } from './use-toast';

export function useJobSubscription(jobId: string, initialData?: Job | null) {
    const [job, setJob] = useState<Job | null>(initialData || null);
    const [loading, setLoading] = useState(!initialData);
    const [error, setError] = useState<Error | null>(null);
    const { toast } = useToast();

    useEffect(() => {
        if (!jobId) return;

        setLoading(true);
        const unsubscribe = onSnapshot(
            doc(db, 'jobs', jobId),
            (docSnapshot) => {
                if (docSnapshot.exists()) {
                    setJob({ id: docSnapshot.id, ...docSnapshot.data() } as Job);
                    setError(null);
                } else {
                    setJob(null);
                    setError(new Error('Job not found'));
                }
                setLoading(false);
            },
            (err) => {
                console.error('Error in job subscription:', err);
                setError(err);
                setLoading(false);
                toast({
                    title: 'Sync Error',
                    description: 'Failed to sync job updates.',
                    variant: 'destructive',
                });
            }
        );

        return () => unsubscribe();
    }, [jobId, toast]);

    return { job, loading, error };
}
