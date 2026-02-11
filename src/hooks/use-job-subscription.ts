"use client";

import { useEffect, useState } from 'react';
import { jobClientService } from '@/domains/jobs/job.client.service';
import { Job } from '@/lib/types'; // Using UI types for now, or ensure domain/jobs/job.types match
import { useToast } from './use-toast';

export function useJobSubscription(jobId: string, initialData?: Job | null) {
    const [job, setJob] = useState<Job | null>(initialData || null);
    const [loading, setLoading] = useState(!initialData);
    const [error, setError] = useState<Error | null>(null);
    const { toast } = useToast();

    useEffect(() => {
        if (!jobId) return;

        if (!job && !initialData) setLoading(true); // Only show loader if we don't have data

        const unsubscribe = jobClientService.subscribeToJob(
            jobId,
            (updatedJob) => {
                if (updatedJob) {
                    setJob(updatedJob);
                    setError(null);
                } else {
                    setJob(null);
                    setError(new Error('Job not found'));
                }
                setLoading(false);
            },
            (err) => {
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
    }, [jobId, toast, initialData]); // eslint-disable-line react-hooks/exhaustive-deps

    return { job, loading, error };
}
