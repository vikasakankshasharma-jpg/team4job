'use server';

import { reviewService } from '@/domains/reviews/review.service';
import { CreateReviewInput } from '@/domains/reviews/review.types';
import { revalidatePath } from 'next/cache';

/**
 * Server Action to submit a review for a completed job.
 * Handles double-blind reveal trigger and reputation indexing.
 */
export async function submitReviewAction(
    input: CreateReviewInput
): Promise<{ success: boolean; reviewId?: string; error?: string }> {
    try {
        const reviewId = await reviewService.submitReview(input);

        // Revalidate the job detail page to reflect the review status
        revalidatePath(`/dashboard/jobs/${input.jobId}`);
        revalidatePath('/dashboard/jobs');

        return { success: true, reviewId };
    } catch (error: any) {
        console.error("[ReviewAction] submitReview failed:", error);
        return {
            success: false,
            error: error.message || 'Failed to submit review',
        };
    }
}
