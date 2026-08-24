import React, { Suspense } from 'react';
import { Loader2 } from "lucide-react";
import DealerJobsClient from './dealer-jobs-client';

export const dynamic = 'force-dynamic';

import { getUserIdFromSession } from '@/lib/auth-server';
import { listDealerJobsAction } from '@/app/actions/job.actions';
import { Job } from '@/lib/types';

export default async function DealerJobsPage() {
    const userId = await getUserIdFromSession();
    let initialJobs: Job[] = [];

    if (userId) {
        const result = await listDealerJobsAction(userId);
        if (result.success && result.data) {
            initialJobs = result.data;
        }
    }

    return (
        <Suspense fallback={
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin" />
            </div>
        }>
            <DealerJobsClient initialJobs={initialJobs} />
        </Suspense>
    );
}
