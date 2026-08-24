
import { reviewRepository } from './review.repository';
import { CreateReviewInput, Review } from './review.types';
import { jobService } from '../jobs/job.service';
import { userService } from '../users/user.service';

import { getAdminDb } from '@/infrastructure/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { aiLearningService } from '@/ai/services/ai-learning.service';
import { reputationService } from '../reputation/reputation.service';

export class ReviewService {
    async submitReview(input: CreateReviewInput): Promise<string> {
        // 1. Validate Job Status
        const job = await jobService.getJobById(input.jobId, input.reviewerId);
        if (job.status !== 'Completed') {
            throw new Error('Can only review completed jobs');
        }

        // 2. Validate Ownership/Permissions
        const clientId = job.clientId || (typeof job.client === 'string' ? job.client : job.client?.id);
        const professionalId = job.awardedProfessionalId || (typeof job.awardedProfessional === 'string' ? job.awardedProfessional : job.awardedProfessional?.id);

        if (input.reviewerId !== clientId && input.reviewerId !== professionalId) {
            throw new Error(`Forbidden. You must be involved in the job to review. Reviewer: ${input.reviewerId}, Client: ${clientId}, Pro: ${professionalId}`);
        }

        // 3. Create Review Document (for audit/history)
        const id = await reviewRepository.create(input);

        // 4. Update Job Progress with Review Data
        const reviewData = {
            rating: input.rating,
            review: input.comment,
            createdAt: new Date(),
            authorId: input.reviewerId,
            authorName: input.reviewerName || 'Member'
        };

        const updateField = input.role === 'Client' ? 'clientReview' : 'professionalReview';
        const flagField = input.role === 'Client' ? 'isReviewedByGiver' : 'isReviewedByProfessional';
        
        await jobService.updateJob(input.jobId, input.reviewerId, { 
            [updateField]: reviewData,
            [flagField]: true
        } as any);

        // 5. Update Target User Stats & Reputation (only for Client reviewing Professional for now)
        if (input.role === 'Client') {
            const db = getAdminDb();
            const userRef = db.collection('users').doc(input.targetUserId);
            
            await db.runTransaction(async (transaction) => {
                const userDoc = await transaction.get(userRef);
                if (!userDoc.exists) return;
                
                const userData = userDoc.data();
                
                // 1. Fetch up to the last 99 reviews for this user to calculate the rolling 100-job average
                const recentReviewsSnap = await transaction.get(
                    db.collection('reviews')
                        .where('targetUserId', '==', input.targetUserId)
                        .orderBy('createdAt', 'desc')
                        .limit(99)
                );
                
                let rollingTotalRating = input.rating;
                let rollingCount = 1;
                
                recentReviewsSnap.forEach(doc => {
                    rollingTotalRating += doc.data().rating || 0;
                    rollingCount++;
                });
                
                const newRating = Number((rollingTotalRating / rollingCount).toFixed(1));
                
                // 2. Keep the lifetime count tracking for display and badge purposes
                const currentCount = userData?.professionalProfile?.reviews || 0;
                const newCount = currentCount + 1;

                const badges: string[] = [];
                if (userData?.isFoundingProfessional) badges.push("Founding Member");
                if (userData?.professionalProfile?.verified) badges.push("Verified Identity");
                if (newCount >= 10) badges.push("Experienced");
                
                if (newRating >= 4.8 && newCount >= 5) {
                    badges.push("Top Rated");
                } else if (newRating >= 4.5 && newCount >= 1) {
                    badges.push("Rising Star");
                }

                transaction.update(userRef, {
                    'professionalProfile.reviews': newCount,
                    'professionalProfile.rating': newRating,
                    'professionalProfile.badges': badges
                });
            });

            // 6. Award Rating-based Reputation Points
            try {
                const jobValue = job.priceEstimate?.max || 500;
                const { bonus, reason } = reputationService.calculateDynamicPoints(jobValue, input.rating);
                
                if (bonus !== 0) {
                    await reputationService.recordEvent({
                        userId: input.targetUserId,
                        points: bonus,
                        reason: `Rating Bonus: ${reason}`,
                        eventType: 'RATING_RECEIVED',
                        jobId: input.jobId,
                        jobValue: jobValue
                    });
                }
            } catch (e) {
                console.error("[ReviewService] Reputation update failed", e);
            }

            // AI Learning: Rate the skill suggestions that defined this job
            try {
                aiLearningService.updateOutcome(input.jobId, 'skill_suggestion', {
                    rating: input.rating,
                    feedback: input.comment,
                    success: input.rating >= 4
                });
            } catch (e) {
                console.error("[ReviewService] AI Learning update failed", e);
            }
        }

        return id;
    }

    async getReviewsForUser(userId: string): Promise<Review[]> {
        return await reviewRepository.fetchByTargetUser(userId);
    }
}

export const reviewService = new ReviewService();
