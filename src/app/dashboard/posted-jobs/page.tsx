import React, { Suspense } from 'react';
import { Loader2 } from "lucide-react";
import PostedJobsClient from './posted-jobs-client';

export const dynamic = 'force-dynamic';

import { getUserIdFromSession } from '@/lib/auth-server';
import { listJobsForJobGiverAction } from '@/app/actions/job.actions';
import { Job } from '@/lib/types';

export default async function PostedJobsPage() {
    const userId = await getUserIdFromSession();
    let initialJobs: Job[] = [];

    if (userId) {
        const result = await listJobsForJobGiverAction(userId);
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
            <PostedJobsClient initialJobs={initialJobs} />
        </Suspense>
    );
}
