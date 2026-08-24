import { DeductReputationInput, ReputationTier, ReputationUpdateResult, ReputationEvent, ReputationEventType, AwardReputationInput } from './reputation.types';
import { getAdminDb } from '@/infrastructure/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { User } from '@/lib/types';

export class ReputationService {
    private readonly SETTINGS_PATH = 'settings/platform';
    private settingsCache: any = null;
    private settingsCacheTimestamp: number = 0;
    private readonly CACHE_TTL_MS = 5 * 60 * 1000;

    private async getSettings(): Promise<any> {
        const now = Date.now();
        if (this.settingsCache && (now - this.settingsCacheTimestamp < this.CACHE_TTL_MS)) {
            return this.settingsCache;
        }

        const db = getAdminDb();
        const settingsSnap = await db.doc(this.SETTINGS_PATH).get();
        this.settingsCache = settingsSnap.data() || {};
        this.settingsCacheTimestamp = now;
        return this.settingsCache;
    }

    /**
     * Calculates the dynamic points based on Job Value and Rating, enforcing the ₹500 threshold.
     */
    calculateDynamicPoints(jobValue: number, rating?: number): { points: number; bonus: number; reason: string } {
        // Enforce exact threshold: Jobs under ₹500 yield 0 reputation points
        if (!jobValue || jobValue < 500) {
            return { points: 0, bonus: 0, reason: 'Job value below minimum threshold (₹500)' };
        }

        // Base points = 20 + (Job Value / 1000), max 100
        let basePoints = Math.min(20 + (jobValue / 1000), 100);

        let bonus = 0;
        let reason = 'Job completed';
        if (rating) {
            if (rating === 5) {
                bonus = basePoints * 0.5;
                reason += ' with 5-star rating';
            } else if (rating === 4) {
                bonus = basePoints * 0.2;
                reason += ' with 4-star rating';
            } else if (rating <= 2) {
                // Negative quality completely wipes the positive base points
                bonus = -basePoints; 
                reason += ' but severely penalized for poor rating';
            }
        }

        return {
            points: Math.round(basePoints),
            bonus: Math.round(bonus),
            reason
        };
    }

    /**
     * Resolves the Tier based on active metrics (fallback to activeCyclePoints if tier requirements not fully enforced yet)
     */
    async calculateTier(activeCyclePoints: number, metrics?: any): Promise<{ tier: ReputationTier; priority: number }> {
        const settings = await this.getSettings();
        const silver = settings.silverTierPoints || 500;
        const gold = settings.goldTierPoints || 1000;
        const platinum = settings.platinumTierPoints || 2000;

        // In a full implementation, we'd check jobs, rating, and dispute rate here.
        // For now, we enforce the hard point gates.
        if (activeCyclePoints >= platinum) return { tier: 'Platinum', priority: 4 };
        if (activeCyclePoints >= gold) return { tier: 'Gold', priority: 3 };
        if (activeCyclePoints >= silver) return { tier: 'Silver', priority: 2 };
        return { tier: 'Bronze', priority: 1 };
    }

    /**
     * Records an immutable event in the Reputation Ledger and recalculates the user's totals.
     */
    async recordEvent(input: AwardReputationInput): Promise<ReputationUpdateResult> {
        const { userId, points, reason, eventType, jobId, dealerId, jobValue } = input;
        const db = getAdminDb();
        const userRef = db.collection('users').doc(userId);
        
        // Deterministic ID for idempotency: eventType_jobId or timestamp if no job
        const eventId = jobId ? eventType + '_' + jobId : eventType + '_' + Date.now();
        const eventRef = db.collection('reputation_ledger').doc(userId + '_' + eventId);

        return await db.runTransaction(async (transaction) => {
            // Idempotency check
            const existingEvent = await transaction.get(eventRef);
            if (existingEvent.exists) {
                throw new Error('Idempotency error: This reputation event has already been recorded.');
            }

            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists) throw new Error('User not found');

            const data = userDoc.data() as User;
            const prof = data.professionalProfile;
            
            // Legacy Migration: Initialize lifetime and active cycle from legacy points if undefined
            let currentLifetime = prof?.lifetimePoints !== undefined ? prof.lifetimePoints : (prof?.points || 0);
            let currentActive = prof?.activeCyclePoints !== undefined ? prof.activeCyclePoints : (prof?.points || 0);

            // Dealer farming check (Max 300 points per dealer per 90 days)
            let actualPointsAwarded = points;
            if (dealerId && points > 0) {
                // In an enterprise system, this would aggregate recent ledger events for this dealer.
            }

            const newLifetime = Math.max(0, currentLifetime + actualPointsAwarded);
            const newActive = Math.max(0, currentActive + actualPointsAwarded);
            const { tier: newTier, priority: newPriority } = await this.calculateTier(newActive, prof?.performanceMetrics);

            // 1. Create the Immutable Event
            const eventData: ReputationEvent = {
                id: eventId,
                professionalId: userId,
                jobId,
                dealerId,
                eventType,
                points: actualPointsAwarded,
                reason,
                jobValue,
                createdAt: Date.now()
            };
            transaction.set(eventRef, eventData);

            // 2. Update the User Profile
            transaction.update(userRef, {
                'professionalProfile.lifetimePoints': newLifetime,
                'professionalProfile.activeCyclePoints': newActive,
                'professionalProfile.points': newActive, // Keep legacy in sync
                'professionalProfile.tier': newTier,
                'professionalProfile.tierPriority': newPriority
            });

            return { newPoints: newActive, newTier, pointsGained: actualPointsAwarded };
        });
    }

    /**
     * Deducts points via Reversal and Penalty logic.
     * Enforces the rule that a Reversal negates the original points, and Penalty applies business logic.
     */
    async handleDisputeOrRefund(userId: string, jobId: string, originalPointsGained: number, penaltyPoints: number): Promise<void> {
        // 1. Issue a Reversal for the exact amount gained originally
        if (originalPointsGained > 0) {
            await this.recordEvent({
                userId,
                points: -originalPointsGained,
                reason: 'Reversal due to refund or dispute',
                eventType: 'REVERSAL',
                jobId
            }).catch(e => console.error('Reversal error:', e)); // catch if already reversed
        }

        // 2. Apply the canonical penalty separately
        if (penaltyPoints > 0) {
            await this.recordEvent({
                userId,
                points: -penaltyPoints,
                reason: 'Verified dispute penalty',
                eventType: 'PENALTY',
                jobId
            }).catch(e => console.error('Penalty error:', e));
        }

        // Remove from disqualified if this resolves it (legacy behavior)
        const db = getAdminDb();
        await db.collection('jobs').doc(jobId).update({
            disqualifiedProfessionalIds: FieldValue.arrayRemove(userId)
        });
    }

    // Keep legacy deductPoints for backward compatibility in the short-term
    async deductPoints(input: DeductReputationInput): Promise<ReputationUpdateResult> {
        return this.recordEvent({
            userId: input.userId,
            points: -input.points,
            reason: input.reason,
            eventType: 'MANUAL_ADJUSTMENT',
            jobId: input.jobId
        });
    }

    // Keep legacy awardPoints for backward compatibility
    async awardPoints(userId: string, points: number, reason: string): Promise<ReputationUpdateResult> {
        return this.recordEvent({
            userId,
            points,
            reason,
            eventType: 'MANUAL_ADJUSTMENT'
        });
    }
}

export const reputationService = new ReputationService();
