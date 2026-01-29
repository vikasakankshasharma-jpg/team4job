'use server';

import { disputeService } from '@/domains/disputes/dispute.service';
import { CreateDisputeInput } from '@/domains/disputes/dispute.types';
import { revalidatePath } from 'next/cache';

export async function createDisputeAction(input: CreateDisputeInput) {
    try {
        const disputeId = await disputeService.createDispute(input);
        if (input.jobId) revalidatePath(`/dashboard/jobs/${input.jobId}`);
        revalidatePath('/dashboard/disputes');
        return { success: true, disputeId };
    } catch (error: any) {
        console.error('createDisputeAction error:', error);
        return { success: false, error: error.message || 'Failed to create dispute' };
    }
}

export async function listMyDisputesAction(userId: string) {
    try {
        const disputes = await disputeService.listMyDisputes(userId);
        return { success: true, disputes };
    } catch (error: any) {
        console.error('listMyDisputesAction error:', error);
        return { success: false, error: error.message || 'Failed to list disputes' };
    }
}
