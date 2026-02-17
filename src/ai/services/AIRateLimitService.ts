
import { getAdminDb } from '@/lib/firebase/server-init';
import { FieldValue } from 'firebase-admin/firestore';

export type RateLimitType = 'ai_chat' | 'ai_bio' | 'ai_image' | 'ai_voice';

interface RateLimitPolicy {
    free: number;
    pro: number;
    admin: number;
}

// Daily limits for different action types
const TIER_LIMITS: Record<RateLimitType, RateLimitPolicy> = {
    'ai_chat': { free: 50, pro: 500, admin: 10000 },
    'ai_bio': { free: 10, pro: 100, admin: 10000 },
    'ai_image': { free: 5, pro: 50, admin: 10000 }, // More expensive
    'ai_voice': { free: 5, pro: 50, admin: 10000 },
};

export const aiRateLimitService = {
    /**
     * Check if a user has exceeded their daily limit for a specific action type.
     * Returns true if allowed, false if blocked.
     */
    async checkLimit(userId: string, type: RateLimitType = 'ai_chat'): Promise<{ allowed: boolean; reason?: string }> {
        try {
            if (process.env.NEXT_PUBLIC_IS_CI === 'true') return { allowed: true };

            const db = getAdminDb();

            // 1. Get User Role (to determine tier)
            // Optimization: In a real app, pass the user object or role to avoid this read.
            // For now, we fetch it or default to 'free' if not found/error (fail safe).
            let role: 'free' | 'pro' | 'admin' = 'free';
            try {
                const userDoc = await db.collection('users').doc(userId).get();
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    if (userData?.roles?.includes('Admin')) role = 'admin';
                    else if (userData?.subscription?.planId) role = 'pro'; // Simple check for now
                }
            } catch (e) {
                console.warn("[RateLimit] Failed to fetch user role, defaulting to FREE:", e);
            }

            const limit = TIER_LIMITS[type][role];
            const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
            const usageDocId = `${userId}_${today}`;
            const docRef = db.collection('ai_usage_daily').doc(usageDocId);

            const doc = await docRef.get();

            let currentUsage = 0;
            if (doc.exists) {
                const data = doc.data();
                currentUsage = data?.[type] || 0;
            }

            if (currentUsage >= limit) {
                return {
                    allowed: false,
                    reason: `Daily limit of ${limit} reached for ${type}. Upgrade to Pro for more.`
                };
            }

            return { allowed: true };

        } catch (error) {
            console.error("[RateLimit] Check failed (FAIL OPEN):", error);
            return { allowed: true }; // Fail Open
        }
    },

    /**
     * Increment the usage counter for a user.
     * This should be called AFTER the action is successfully performed (or attempted).
     */
    async incrementUsage(userId: string, type: RateLimitType = 'ai_chat', count: number = 1): Promise<void> {
        try {
            if (process.env.NEXT_PUBLIC_IS_CI === 'true') return;

            const db = getAdminDb();
            const today = new Date().toISOString().split('T')[0];
            const usageDocId = `${userId}_${today}`;
            const docRef = db.collection('ai_usage_daily').doc(usageDocId);

            await docRef.set({
                [type]: FieldValue.increment(count),
                lastUpdated: FieldValue.serverTimestamp(),
                userId // Useful for querying/indexing
            }, { merge: true });

        } catch (error) {
            console.error("[RateLimit] Increment failed:", error);
        }
    }
};
