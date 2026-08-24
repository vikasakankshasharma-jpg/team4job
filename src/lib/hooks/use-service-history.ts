import { useQuery } from '@tanstack/react-query';
import { getCustomerServiceHistoryAction } from '@/app/actions/history.actions';

export function useServiceHistory(clientId: string | undefined) {
    return useQuery({
        queryKey: ['service-history', clientId],
        queryFn: async () => {
            if (!clientId) return [];
            const res = await getCustomerServiceHistoryAction(clientId);
            if (!res.success) throw new Error(res.error);
            return res.history || [];
        },
        enabled: !!clientId,
    });
}
