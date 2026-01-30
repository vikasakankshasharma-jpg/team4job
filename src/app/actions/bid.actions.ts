'use server';

import { jobService } from '@/domains/jobs/job.service';
import { bidService } from '@/domains/bids/bid.service';
import { revalidatePath } from 'next/cache';
import { Role } from '@/lib/types';

/**
 * Server Action to place a bid
 */
export async function placeBidAction(jobId: string, userId: string, role: Role, data: any) {
    try {
        await bidService.placeBid(userId, role, {
            ...data,
            jobId
        });
        revalidatePath(`/dashboard/jobs/${jobId}`);
        return { success: true };
    } catch (error: any) {
        console.error('placeBidAction error:', error);
        return { success: false, error: error.message || 'Failed to place bid' };
    }
}

/**
 * Server Action to list bids placed by a specific installer
 */
export async function listMyBidsAction(userId: string) {
    try {
        // Implementation logic moved from api/bids/my-bids
        // For simplicity, we'll implement it here or in jobService
        const bids = await jobService.getBidsByInstaller(userId);
        return { success: true, bids: JSON.parse(JSON.stringify(bids)) };
    } catch (error: any) {
        console.error('listMyBidsAction error:', error);
        return { success: false, error: error.message || 'Failed to list bids' };
    }
}

/**
 * Server Action to get bids for a specific job
 */
export async function getBidsForJobAction(jobId: string, userId: string) {
    try {
        const bids = await jobService.getBidsForJob(jobId, userId);
        return { success: true, bids: JSON.parse(JSON.stringify(bids)) };
    } catch (error: any) {
        console.error('getBidsForJobAction error:', error);
        return { success: false, error: error.message || 'Failed to fetch bids' };
    }
}
