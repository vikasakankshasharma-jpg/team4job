import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { useFirebase } from '@/infrastructure/firebase/client-provider';
import { CommunicationItem } from '@/lib/services/timeline-builder';

export function useCommunications(jobId: string) {
    const { db } = useFirebase();
    const queryClient = useQueryClient();
    // Wrap queryKey in useMemo or statically define it to prevent unnecessary effect triggers
    const queryKey = ['communications', jobId];

    useEffect(() => {
        if (!db || !jobId) return;

        const q = query(
            collection(db, `jobs/${jobId}/communications`),
            orderBy('timestamp', 'asc'),
            limit(100)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            } as CommunicationItem));
            
            // Push directly to React Query Cache
            queryClient.setQueryData(queryKey, msgs);
        });

        return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [db, jobId, queryClient]);

    return useQuery<CommunicationItem[]>({
        queryKey,
        queryFn: async () => {
            // Optional: fallback fetch if onSnapshot is delayed
            return []; 
        },
        staleTime: Infinity, // Let Firebase onSnapshot handle invalidation
    });
}
