import React, { Suspense } from 'react';
import { Loader2 } from "lucide-react";
import AllJobsClient from './all-jobs-client';

export const dynamic = 'force-dynamic';

export default function AllJobsPage() {
    return (
        <Suspense fallback={
            <div className="flex h-48 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        }>
            <AllJobsClient />
        </Suspense>
    );
}
