"use client";

import { SearchProvider } from "@/hooks/use-search";

export function DashboardProviders({ children }: { children: React.ReactNode }) {
    return (
        <SearchProvider>
            {children}
        </SearchProvider>
    );
}
