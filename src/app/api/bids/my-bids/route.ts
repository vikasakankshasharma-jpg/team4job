import { NextRequest, NextResponse } from 'next/server';
import { bidRepository } from '@/domains/bids/bid.repository';
import { jobRepository } from '@/domains/jobs/job.repository';

/**
 * GET /api/bids/my-bids
 * Fetch all bids for an installer with pagination
 * Query params:
 * - userId: Installer ID (required)
 * - limit: Number of bids per page (default 50)
 * - lastTimestamp: ISO string of last bid timestamp for cursor pagination
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        const limit = parseInt(searchParams.get('limit') || '50');
        const lastTimestamp = searchParams.get('lastTimestamp');

        if (!userId) {
            return NextResponse.json(
                { error: 'userId is required' },
                { status: 400 }
            );
        }

        // Fetch bids with pagination
        const bids = await bidRepository.fetchBidsByInstaller(
            userId,
            limit,
            lastTimestamp ? new Date(lastTimestamp) : undefined
        );

        // Fetch associated job data for each bid
        const jobIds = [...new Set(bids.map(bid => (bid as any).jobId).filter(Boolean))];
        const jobsMap = new Map();

        // Fetch jobs in parallel
        await Promise.all(
            jobIds.map(async (jobId) => {
                try {
                    const job = await jobRepository.fetchById(jobId);
                    if (job) {
                        jobsMap.set(jobId, job);
                    }
                } catch (error) {
                    console.error(`Failed to fetch job ${jobId}:`, error);
                }
            })
        );

        // Attach job data to each bid
        const bidsWithJobs = bids.map(bid => ({
            ...bid,
            job: jobsMap.get((bid as any).jobId) || null
        }));

        return NextResponse.json({
            success: true,
            bids: bidsWithJobs,
            hasMore: bids.length === limit
        });
    } catch (error: any) {
        console.error('Failed to fetch bids:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch bids' },
            { status: 500 }
        );
    }
}
