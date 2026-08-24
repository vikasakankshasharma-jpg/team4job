import { getAdminDb } from '@/infrastructure/firebase/admin';
import { Job, User } from '@/lib/types';
import { RecommendedInstallerDTO } from './matching.types';
import { jobRepository } from '@/domains/jobs/job.repository';
import { userRepository } from '@/domains/users/user.repository';

export const matchingService = {
    async getSmartMatches(jobId: string, limit = 5): Promise<RecommendedInstallerDTO[]> {
        // 1. Fetch Job
        const job = await jobRepository.fetchById(jobId);
        if (!job) throw new Error('Job not found');

        // 2. Fetch Eligibility Candidates (Memory pool, max 100)
        // We use queryProfessionals and then further filter in memory
        let candidates = await userRepository.queryProfessionals({
            verified: true, // Baseline eligibility
        }, 100);

        // Filter status and skills
        candidates = candidates.filter(c => 
            c.status === 'active' &&
            c.professionalProfile?.availability?.status !== 'busy' &&
            c.professionalProfile?.skills?.includes(job.jobCategory)
            // HARD EXCLUSION: Exclude if they have an active dispute
            // && !c.activeDisputes?.includes(job.dealerId || job.clientId)
        );

        console.log(`[SmartMatching] After memory filter for active/CCTV: ${candidates.length} candidates.`);

        // 3. Fetch Service Location History if present
        // Map of professionalId -> Historical Job[]
        const siteHistoryMap = new Map<string, Job[]>();
        if (job.serviceLocationId) {
            const history = await jobRepository.getServiceHistory(job.serviceLocationId, jobId);
            history.forEach(h => {
                if (h.awardedProfessionalId) {
                    const existing = siteHistoryMap.get(h.awardedProfessionalId) || [];
                    existing.push(h);
                    siteHistoryMap.set(h.awardedProfessionalId, existing);
                }
            });
        }

        // 4. Score Candidates
        const scoredCandidates = candidates.map(candidate => {
            const prof = candidate.professionalProfile;
            let aiExplanation = "Matched based on skills and profile.";
            let isPreviousInstallerAtSite = false;
            
            const breakdown = {
                currentPerformance: 0, // max 40
                ratingQuality: 0, // max 20
                reputationTier: 0, // max 15
                location: 0, // max 15
                relationship: 0, // max 10
                penalty: 0
            };
            
            // 1. Location (Max 15)
            const jobPincode = job.address.cityPincode;
            const userPincode = candidate.address?.cityPincode || candidate.pincodes?.residential;
            if (jobPincode && userPincode) {
                if (jobPincode === userPincode) {
                    breakdown.location = 15;
                } else if (jobPincode.substring(0, 3) === userPincode.substring(0, 3)) {
                    breakdown.location = 7;
                }
            }

            // 2. Rating Quality + Confidence Engine (Max 20)
            const rating = prof?.rating || 0;
            const reviews = prof?.reviews || 0;
            let qualityScore = (rating / 5) * 20;

            // Apply confidence multiplier based on review volume
            let confidence = 'Very Low';
            if (reviews >= 50) {
                confidence = 'High';
            } else if (reviews >= 10) {
                confidence = 'Medium';
                qualityScore *= 0.8; // Need more history for full weight
            } else if (reviews >= 3) {
                confidence = 'Low';
                // High Potential Engine for perfect new installers
                if (rating >= 4.8) {
                    qualityScore *= 0.9; // Boosted due to High Potential
                    aiExplanation = "High Potential — Limited History but excellent early reviews.";
                } else {
                    qualityScore *= 0.6;
                }
            } else {
                qualityScore *= 0.3; // Very Low Confidence
            }
            breakdown.ratingQuality = qualityScore;

            // 3. Current Performance (Max 40)
            const activePoints = prof?.activeCyclePoints || prof?.points || 0;
            // Map 0 - 2000 active points to a 0 - 40 scale
            breakdown.currentPerformance = (Math.min(activePoints, 2000) / 2000) * 40;

            // 4. Reputation / Tier (Max 15)
            if (prof?.tier === 'Platinum') breakdown.reputationTier = 15;
            else if (prof?.tier === 'Gold') breakdown.reputationTier = 10;
            else if (prof?.tier === 'Silver') breakdown.reputationTier = 5;
            else breakdown.reputationTier = 0;

            // 5. Relationship / Private Moat (Max 10, or negative penalties)
            const pastJobsAtSite = siteHistoryMap.get(candidate.id);
            let hasDispute = false;

            if (pastJobsAtSite && pastJobsAtSite.length > 0) {
                isPreviousInstallerAtSite = true;
                for (const pastJob of pastJobsAtSite) {
                    if (pastJob.status === 'disputed') {
                        hasDispute = true;
                        breakdown.penalty -= 100; // Heavy penalty
                    } else if (pastJob.clientReview) {
                        const pastRating = pastJob.clientReview.rating;
                        if (pastRating >= 4) breakdown.relationship += 10; // Max out relationship
                        else if (pastRating === 3) breakdown.relationship += 0;
                        else if (pastRating <= 2) breakdown.relationship -= 40;
                    } else if (pastJob.status === 'completed') {
                        breakdown.relationship += 5; // Positive signal
                    }
                }
                // Clamp relationship boost to max 10
                breakdown.relationship = Math.min(breakdown.relationship, 10);
            }

            // Calculate total raw score (Max possible before clamping is 100)
            let score = breakdown.ratingQuality + 
                        breakdown.currentPerformance + 
                        breakdown.reputationTier + 
                        breakdown.location + 
                        breakdown.relationship + 
                        breakdown.penalty;

            // HARD EXCLUSION logic via penalty drop
            if (hasDispute) {
                score = -999;
            }

            // Simple Deterministic AI Explanation mapping
            if (isPreviousInstallerAtSite && score > 60) {
                if (job.requesterType === 'DEALER') {
                    aiExplanation = "Successfully worked at this site before.";
                } else {
                    aiExplanation = "Highly experienced in your local area.";
                }
            } else if (breakdown.location === 15 && score >= 75) {
                aiExplanation = "Highly rated in your exact pincode.";
            } else if (confidence === 'High' && breakdown.reputationTier >= 10) {
                aiExplanation = `Veteran professional with a strong active track record.`;
            } else if (score >= 60 && aiExplanation === "Matched based on skills and profile.") {
                aiExplanation = "Strong match based on current performance and quality.";
            } else if (isPreviousInstallerAtSite && score < 40) {
                aiExplanation = "Has prior history at this site but lower active performance score.";
            }

            // Clamp score between 0 and 100 for final UX
            const finalMatchScore = Math.max(0, Math.min(Math.round(score), 100));

            return {
                professionalId: candidate.id,
                name: candidate.name,
                avatarUrl: candidate.avatarUrl,
                rating: prof?.rating || 0,
                reviewsCount: reviews,
                tier: prof?.tier || 'Bronze',
                matchScore: finalMatchScore, 
                confidence,
                scoreBreakdown: breakdown,
                rawScore: score,
                aiExplanation,
                isPreviousInstallerAtSite: job.requesterType === 'DEALER' ? isPreviousInstallerAtSite : false
            };
        });

        // 5. Filter exclusions and Rank
        const viableCandidates = scoredCandidates.filter(c => c.rawScore > 0);
        viableCandidates.sort((a, b) => b.matchScore - a.matchScore);

        return viableCandidates.slice(0, limit);
    }
};
