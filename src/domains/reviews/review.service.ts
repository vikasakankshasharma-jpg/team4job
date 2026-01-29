
import { reviewRepository } from './review.repository';
import { CreateReviewInput, Review } from './review.types';
import { jobService } from '../jobs/job.service';
import { userService } from '../users/user.service';
import { logger } from '@/infrastructure/logger';
import { getAdminDb } from '@/infrastructure/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export class ReviewService {
    async submitReview(input: CreateReviewInput): Promise<string> {
        // 1. Validate Job Status
        const job = await jobService.getJobById(input.jobId, input.reviewerId);
        if (job.status !== 'Completed') {
            throw new Error('Can only review completed jobs');
        }

        // 2. Validate Ownership/Permissions
        const jobGiverId = typeof job.jobGiver === 'string' ? job.jobGiver : job.jobGiver.id;
        const installerId = job.awardedInstallerId || (typeof job.awardedInstaller === 'string' ? job.awardedInstaller : job.awardedInstaller?.id);

        if (input.reviewerId !== jobGiverId && input.reviewerId !== installerId) {
            throw new Error('Forbidden. You must be involved in the job to review.');
        }

        // 3. Create Review
        const id = await reviewRepository.create(input);

        // 4. Update Job Progress
        const updateField = input.role === 'Job Giver' ? 'isReviewedByGiver' : 'isReviewedByInstaller';
        await jobService.updateJob(input.jobId, input.reviewerId, { [updateField]: true } as any);

        // 5. Update Target User Stats
        if (input.role === 'Job Giver') {
            // Update installer rating count
            const db = getAdminDb();
            await db.collection('users').doc(input.targetUserId).update({
                'installerProfile.reviews': FieldValue.increment(1)
            });
        }

        logger.userActivity(input.reviewerId, 'review_submitted', { jobId: input.jobId, targetUserId: input.targetUserId });

        return id;
    }

    async getReviewsForUser(userId: string): Promise<Review[]> {
        return await reviewRepository.fetchByTargetUser(userId);
    }
}

export const reviewService = new ReviewService();
