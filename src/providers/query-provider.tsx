'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import dynamic from 'next/dynamic';

const QueryDevtools = dynamic(
    () => import('@tanstack/react-query-devtools').then((mod) => mod.ReactQueryDevtools),
    {
        ssr: false,
    }
);

export function QueryProvider({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(() => new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 60 * 1000,
                gcTime: 5 * 60 * 1000,
                retry: 1,
                refetchOnWindowFocus: false,
            },
        },
    }));

    const isDev = process.env.NODE_ENV === 'development';

    return (
        <QueryClientProvider client={queryClient}>
            {children}
            {isDev && <QueryDevtools initialIsOpen={false} />}
        </QueryClientProvider>
    );
}
