'use server';

import { reputationService } from '@/domains/reputation/reputation.service';
import { DeductReputationInput } from '@/domains/reputation/reputation.types';
import { revalidatePath } from 'next/cache';

export async function deductReputationAction(input: DeductReputationInput) {
    try {
        const newPoints = await reputationService.deductPoints(input);
        revalidatePath(`/dashboard/users/${input.userId}`);
        if (input.jobId) revalidatePath(`/dashboard/jobs/${input.jobId}`);
        return { success: true, newPoints };
    } catch (error: any) {
        console.error('deductReputationAction error:', error);
        return { success: false, error: error.message || 'Failed to deduct reputation' };
    }
}
