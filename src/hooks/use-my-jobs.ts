import { useState, useCallback, useEffect, useRef } from 'react';
import { useUser } from '@/hooks/use-user';
import { Job } from '@/lib/types';
import { toDate } from '@/lib/utils';

interface UseMyJobsReturn {
    jobs: Job[];
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
    loadMore: () => Promise<void>;
    hasMore: boolean;
    loadMoreLoading: boolean;
}

export function useMyJobs(initialData?: Job[]): UseMyJobsReturn {
    const { user, role } = useUser();
    const [jobs, setJobs] = useState<Job[]>(initialData || []);
    // If we have initial data, we are not loading initially
    const [loading, setLoading] = useState(!initialData);
    const [error, setError] = useState<string | null>(null);

    const [hasMore, setHasMore] = useState(true);
    const [loadMoreLoading, setLoadMoreLoading] = useState(false);

    // Keep jobs in a ref to avoid fetchJobs dependency on jobs state
    const jobsRef = useRef<Job[]>(jobs);
    useEffect(() => {
        jobsRef.current = jobs;
    }, [jobs]);

    const fetchJobs = useCallback(async (isLoadMore = false) => {
        if (!user || role !== 'Job Giver') {
            setLoading(false);
            return;
        }

        if (isLoadMore) {
            setLoadMoreLoading(true);
        } else {
            setLoading(true);
        }
        setError(null);

        try {
            const { listJobsForJobGiverAction } = await import('@/app/actions/job.actions');

            // Calculate cursor using ref
            let lastPostedAt: string | undefined = undefined;
            const currentJobs = jobsRef.current;
            if (isLoadMore && currentJobs.length > 0) {
                const lastJob = currentJobs[currentJobs.length - 1];
                const date = toDate(lastJob.postedAt);
                if (!isNaN(date.getTime())) {
                    lastPostedAt = date.toISOString();
                }
            }

            const res = await listJobsForJobGiverAction(user.id, 50, lastPostedAt);

            if (!res.success || !res.data) {
                throw new Error(res.error || 'Failed to fetch jobs');
            }

            const newJobs = res.data;

            if (isLoadMore) {
                setJobs(prev => {
                    const existingIds = new Set(prev.map(j => j.id));
                    const unique = newJobs.filter(j => !existingIds.has(j.id));
                    return [...prev, ...unique];
                });
            } else {
                setJobs(newJobs);
            }

            // Check if we reached end
            if (newJobs.length < 50) {
                setHasMore(false);
            } else {
                setHasMore(true);
            }

        } catch (err: any) {
            console.error("Error fetching posted jobs:", err);
            setError(err.message || "Failed to load jobs");
        } finally {
            if (isLoadMore) {
                setLoadMoreLoading(false);
            } else {
                setLoading(false);
            }
        }
    }, [user, role]);

    useEffect(() => {
        if (user && !initialData) {
            fetchJobs(false);
        } else if (initialData) {
            // Using initial data, just check if it was full page to set hasMore
            if (initialData.length < 50) setHasMore(false);
        }
    }, [user, initialData, fetchJobs]);

    return { jobs, loading, error, refetch: () => fetchJobs(false), loadMore: () => fetchJobs(true), hasMore, loadMoreLoading };
}
