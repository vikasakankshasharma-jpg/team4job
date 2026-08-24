import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { collection, query, orderBy, limit, onSnapshot, where } from 'firebase/firestore';
import { useFirebase } from '@/infrastructure/firebase/client-provider';
import { JobEvent } from '@/domains/jobs/timeline.types';

export function useJobTimelineEvents(jobId: string) {
    const { db } = useFirebase();
    const queryClient = useQueryClient();
    const queryKey = ['timelineEvents', jobId];

    useEffect(() => {
        if (!db || !jobId) return;

        const q = query(
            collection(db, `job_events`),
            where('jobId', '==', jobId),
            orderBy('timestamp', 'asc'),
            limit(100)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const events = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            } as JobEvent));
            
            // Push directly to React Query Cache
            queryClient.setQueryData(queryKey, events);
        });

        return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [db, jobId, queryClient]);

    return useQuery<JobEvent[]>({
        queryKey,
        queryFn: async () => {
            return []; 
        },
        staleTime: Infinity, // Let Firebase onSnapshot handle invalidation
    });
}
