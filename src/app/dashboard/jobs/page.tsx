
import React, { Suspense } from 'react';
import { Loader2 } from "lucide-react";
import BrowseJobsClient from './browse-jobs-client';

import { listOpenJobsAction } from '@/app/actions/job.actions';
import { Job } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function BrowseJobsPage() {
    let initialJobs: Job[] = [];
    const result = await listOpenJobsAction();
    if (result.success && result.data) {
        initialJobs = result.data;
    }

    return (
        <Suspense fallback={
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin" />
            </div>
        }>
            <BrowseJobsClient initialJobs={initialJobs} />
        </Suspense>
    );
}
