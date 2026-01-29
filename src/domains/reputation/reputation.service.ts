
import { DeductReputationInput } from './reputation.types';
import { getAdminDb } from '@/infrastructure/firebase/admin';
import { logger } from '@/infrastructure/logger';
import { FieldValue } from 'firebase-admin/firestore';
import { userService } from '../users/user.service';

export class ReputationService {
    async deductPoints(input: DeductReputationInput): Promise<number> {
        const { userId, points, reason, jobId } = input;

        if (points < 0) throw new Error('Points must be positive');

        const db = getAdminDb();
        const userRef = db.collection('users').doc(userId);
        const userSnap = await userRef.get();

        if (!userSnap.exists) throw new Error('User not found');

        const data = userSnap.data();
        const currentPoints = data?.installerProfile?.reputationPoints || 0;
        const newPoints = Math.max(0, currentPoints - points);

        // Update Reputation
        await userRef.update({
            'installerProfile.reputationPoints': newPoints
        });

        // 2. If jobId provided, remove from disqualified list (as penalty was paid)
        if (jobId) {
            await db.collection('jobs').doc(jobId).update({
                disqualifiedInstallerIds: FieldValue.arrayRemove(userId)
            });
        }

        logger.adminAction('SYSTEM', 'REPUTATION_DEDUCTED', userId, {
            points,
            reason,
            jobId,
            oldPoints: currentPoints,
            newPoints
        });

        return newPoints;
    }

    async addPoints(userId: string, points: number, reason: string): Promise<void> {
        const db = getAdminDb();
        await db.collection('users').doc(userId).update({
            'installerProfile.reputationPoints': FieldValue.increment(points)
        });
        logger.info('Reputation points added', { userId, points, reason });
    }
}

export const reputationService = new ReputationService();
