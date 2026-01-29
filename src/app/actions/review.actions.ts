'use server';

import { reviewService } from '@/domains/reviews/review.service';
import { CreateReviewInput } from '@/domains/reviews/review.types';
import { revalidatePath } from 'next/cache';

export async function submitReviewAction(input: CreateReviewInput) {
    try {
        const reviewId = await reviewService.submitReview(input);
        revalidatePath(`/dashboard/jobs/${input.jobId}`);
        return { success: true, reviewId };
    } catch (error: any) {
        console.error('submitReviewAction error:', error);
        return { success: false, error: error.message || 'Failed to submit review' };
    }
}
