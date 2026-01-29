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
        if (!id) return { title: 'CCTV Job Connect' };

        // Use JobService instead of direct DB access
        const job = await jobService.getJobById(id, 'system-metadata');

        return {
            title: `${job?.title} | CCTV Job Connect`,
            description: job?.description?.substring(0, 160) || 'Hire verified CCTV professionals for your security needs.',
            openGraph: {
                title: `${job?.title} - Remote Hire`,
                description: job?.description?.substring(0, 200),
                type: 'website',
            }
        }
    } catch (error) {
        return {
            title: 'Job Not Found | CCTV Job Connect',
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
            const userId = await getUserIdFromSession();

            // Only fetch bids if we have a user (though layouts usually enforce auth)
            // If no user, bidsRes will be skipped or we pass '' (which will fail gracefully in service)
            const [jobData, bidsRes] = await Promise.all([
                jobService.getJobById(id, 'system-ssr'),
                userId ? getBidsForJobAction(id, userId) : Promise.resolve({ success: true, bids: [] })
            ]);

            initialJob = JSON.parse(JSON.stringify(jobData));
            if (bidsRes.success) {
                initialBids = bidsRes.bids || [];
            }
        } catch (error) {
            console.error("Error pre-fetching job data:", error);
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
