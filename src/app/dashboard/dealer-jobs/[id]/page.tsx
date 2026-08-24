import React, { Suspense } from 'react';
import { Loader2 } from "lucide-react";
import DealerJobDetailsClient from './dealer-job-details-client';
import { getDealerJobAction } from '@/app/actions/dealer.actions';

export const dynamic = 'force-dynamic';

export default async function DealerJobDetailsPage({ params }: { params: { id: string } }) {
    const { id } = params;
    
    // Server fetch job details
    const result = await getDealerJobAction(id);
    const initialJob = result.success && result.data ? result.data : null;

    if (!initialJob) {
        return (
            <div className="flex items-center justify-center h-full p-8">
                <p className="text-muted-foreground">Job not found or you are not authorized to view it.</p>
            </div>
        );
    }

    return (
        <Suspense fallback={
            <div className="flex items-center justify-center h-full min-h-[500px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        }>
            <DealerJobDetailsClient initialJob={initialJob} />
        </Suspense>
    );
}
