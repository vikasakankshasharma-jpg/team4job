import { useState, useCallback, useEffect } from 'react';
import { useUser } from '@/hooks/use-user';
import { Job } from '@/lib/types';

interface UseMyJobsReturn {
    jobs: Job[];
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

export function useMyJobs(): UseMyJobsReturn {
    const { user, role } = useUser();
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchJobs = useCallback(async () => {
        if (!user || role !== 'Job Giver') {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const { listJobsForJobGiverAction } = await import('@/app/actions/job.actions');
            const res = await listJobsForJobGiverAction(user.id);

            if (!res.success || !res.data) {
                throw new Error(res.error || 'Failed to fetch jobs');
            }

            setJobs(res.data);
        } catch (err: any) {
            console.error("Error fetching posted jobs:", err);
            setError(err.message || "Failed to load jobs");
        } finally {
            setLoading(false);
        }
    }, [user, role]);

    useEffect(() => {
        if (user) {
            fetchJobs();
        }
    }, [user, fetchJobs]);

    return { jobs, loading, error, refetch: fetchJobs };
}
