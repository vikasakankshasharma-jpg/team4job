import React, { Suspense } from 'react';
import { Loader2 } from "lucide-react";
import JobDetailClient from './job-detail-client';
import { Metadata } from 'next';
import { jobService } from '@/domains/jobs/job.service';
import { getBidsForJobAction } from '@/app/actions/bid.actions';
import { getUserIdFromSession } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

type Props = {
    params: Promise<{ id: string }>
}

export async function generateMetadata(
    props: Props,
): Promise<Metadata> {
    const params = await props.params;
    const id = params.id

    try {
        if (!id) return { title: 'Team4Job' };

        // Use JobService instead of direct DB access
        const job = await jobService.getJobById(id, 'system-metadata');

        return {
            title: `${job?.title} | Team4Job`,
            description: job?.description?.substring(0, 160) || 'Hire verified technical professionals for your security needs.',
            openGraph: {
                title: `${job?.title} - Remote Hire`,
                description: job?.description?.substring(0, 200),
                type: 'website',
            }
        }
    } catch (error) {
        return {
            title: 'Job Not Found | Team4Job',
            description: 'The requested job could not be found.'
        }
    }
}
export default async function JobDetailPageWrapper(props: Props) {
    const params = await props.params;
    const id = params.id;
    let initialJob = null;
    let initialBids = [];

    if (id) {
        try {
            console.log(`[JobDetailSSR] Starting SSR fetch for Job ID: ${id}`);
            const userId = await getUserIdFromSession();
            console.log(`[JobDetailSSR] Session userId: ${userId || 'Anonymous'}`);

            // Only fetch bids if we have a user (though layouts usually enforce auth)
            const [jobData, bidsRes] = await Promise.all([
                jobService.getJobById(id, userId || 'system-ssr'),
                userId ? getBidsForJobAction(id, userId) : Promise.resolve({ success: true, bids: [] })
            ]).catch(err => {
                console.error(`[JobDetailSSR] Promise.all failed: ${err.message}`);
                throw err;
            });

            if (!jobData) {
                console.warn(`[JobDetailSSR] Job not found for ID: ${id}`);
                initialJob = null;
            } else {
                initialJob = JSON.parse(JSON.stringify(jobData));
                console.log(`[JobDetailSSR] Job data fetched successfully: ${initialJob.title}`);
            }

            if (bidsRes && 'success' in bidsRes && bidsRes.success) {
                initialBids = bidsRes.bids || [];
                console.log(`[JobDetailSSR] Bids fetched: ${initialBids.length}`);
            } else {
                const errorMsg = bidsRes && 'error' in bidsRes ? bidsRes.error : 'Fetch failed';
                console.warn(`[JobDetailSSR] Bids fetch failed: ${errorMsg}`);
            }
        } catch (error: any) {
            console.error(`[JobDetailSSR] Fatal error during SSR for job ${id}:`, error.message);
            // We still want to render the client component if possible to show a friendly error
            initialJob = null;
        }
    }

    return (
        <Suspense fallback={
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin" />
            </div>
        }>
            <JobDetailClient isMapLoaded={true} initialJob={initialJob} initialBids={initialBids} />
        </Suspense>
    );
}
