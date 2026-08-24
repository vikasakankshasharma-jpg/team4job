"use server";

import { requireAuth } from '@/lib/auth-server';
import { jobRepository } from '@/domains/jobs/job.repository';
import { matchingService } from '@/domains/matching/matching.service';
import { RecommendedInstallerDTO } from '@/domains/matching/matching.types';

export async function getSmartMatchesAction(jobId: string): Promise<{ success: boolean; data?: RecommendedInstallerDTO[]; error?: string }> {
    try {
        const { uid: userId } = await requireAuth();
        
        // Fetch Job to verify ownership
        const job = await jobRepository.fetchById(jobId);
        if (!job) {
            return { success: false, error: 'Job not found' };
        }

        // Only the Job Owner (B2C or B2B) can see matches
        if (job.clientId !== userId && job.dealerId !== userId) {
            return { success: false, error: 'Not Authorized to view matches for this job' };
        }

        // Fetch matches
        const matches = await matchingService.getSmartMatches(jobId, 5);

        return { success: true, data: matches };
    } catch (error: any) {
        console.error("Failed to get smart matches:", error);
        return { success: false, error: error.message || 'Failed to fetch recommendations' };
    }
}
