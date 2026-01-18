
import React, { Suspense } from 'react';
import dynamicImport from 'next/dynamic';
import { Loader2 } from "lucide-react";

const ReportsClient = dynamicImport(() => import('./reports-client'), {
    loading: () => (
        <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
    ),
});

export const dynamic = 'force-dynamic';

export default function ReportsPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin" />
            </div>
        }>
            <ReportsClient />
        </Suspense>
    );
}
