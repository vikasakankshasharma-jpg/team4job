
import { DeductReputationInput, ReputationTier, ReputationUpdateResult } from './reputation.types';
import { getAdminDb } from '@/infrastructure/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export class ReputationService {
    private readonly SETTINGS_PATH = 'settings/platform';

    /**
     * Calculates the points earned based on job completion and rating.
     * Uses platform settings with hardcoded defaults.
     */
    async calculatePointsForJob(rating?: number): Promise<number> {
        const db = getAdminDb();
        const settingsSnap = await db.doc(this.SETTINGS_PATH).get();
        const settings = settingsSnap.data() || {};

        const pointsForCompletion = settings.pointsForJobCompletion || 50;
        const pointsFor5Star = settings.pointsFor5StarRating || 20;
        const pointsFor4Star = settings.pointsFor4StarRating || 10;
        const penaltyFor1Star = settings.penaltyFor1StarRating || -25;

        let points = pointsForCompletion;

        if (rating === 5) points += pointsFor5Star;
        else if (rating === 4) points += pointsFor4Star;
        else if (rating === 1) points += penaltyFor1Star;

        return points;
    }

    /**
     * Determines the tier based on total points.
     */
    async calculateTier(points: number): Promise<{ tier: ReputationTier; priority: number }> {
        const db = getAdminDb();
        const settingsSnap = await db.doc(this.SETTINGS_PATH).get();
        const settings = settingsSnap.data() || {};

        const silverTierPoints = settings.silverTierPoints || 500;
        const goldTierPoints = settings.goldTierPoints || 1000;
        const platinumTierPoints = settings.platinumTierPoints || 2000;

        if (points >= platinumTierPoints) return { tier: 'Platinum', priority: 4 };
        if (points >= goldTierPoints) return { tier: 'Gold', priority: 3 };
        if (points >= silverTierPoints) return { tier: 'Silver', priority: 2 };
        return { tier: 'Bronze', priority: 1 };
    }

    /**
     * Deducts points from a user (e.g. for cancellations or re-apply penalties).
     */
    async deductPoints(input: DeductReputationInput): Promise<ReputationUpdateResult> {
        const { userId, points, reason, jobId } = input;
        const db = getAdminDb();
        const userRef = db.collection('users').doc(userId);

        return await db.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists) throw new Error('User not found');

            const data = userDoc.data();
            const currentPoints = data?.professionalProfile?.points || 0;
            const newPoints = Math.max(0, currentPoints - points);
            const { tier: newTier, priority: newPriority } = await this.calculateTier(newPoints);

            transaction.update(userRef, {
                'professionalProfile.points': newPoints,
                'professionalProfile.tier': newTier,
                'professionalProfile.tierPriority': newPriority
            });

            // If penalty was paid for a specific job, we can remove them from disqualified list
            if (jobId) {
                const jobRef = db.collection('jobs').doc(jobId);
                transaction.update(jobRef, {
                    disqualifiedProfessionalIds: FieldValue.arrayRemove(userId)
                });
            }

            return { newPoints, newTier, pointsGained: -points };
        });
    }

    /**
     * Awards points to a user and updates their tier and history.
     */
    async awardPoints(userId: string, points: number, reason: string): Promise<ReputationUpdateResult> {
        const db = getAdminDb();
        const userRef = db.collection('users').doc(userId);

        return await db.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists) throw new Error('User not found');

            const data = userDoc.data();
            const currentPoints = data?.professionalProfile?.points || 0;
            const newPoints = currentPoints + points;
            const { tier: newTier, priority: newPriority } = await this.calculateTier(newPoints);

            const monthYear = new Date().toLocaleString("default", { month: "long", year: "numeric" });
            const history = data?.professionalProfile?.reputationHistory || [];
            
            const monthIndex = history.findIndex((h: any) => h.month === monthYear);
            if (monthIndex > -1) {
                history[monthIndex].points += points;
            } else {
                history.push({ month: monthYear, points: points });
            }
            // Keep last 12 months
            if (history.length > 12) history.shift();

            transaction.update(userRef, {
                'professionalProfile.points': newPoints,
                'professionalProfile.tier': newTier,
                'professionalProfile.tierPriority': newPriority,
                'professionalProfile.reputationHistory': history
            });

            return { newPoints, newTier, pointsGained: points };
        });
    }
}

export const reputationService = new ReputationService();
