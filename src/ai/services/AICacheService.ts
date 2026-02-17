import { getAdminDb } from '@/infrastructure/firebase/admin';
import { createHash } from 'crypto';
import { Timestamp } from 'firebase-admin/firestore';

export type AIResponseCacheEntry = {
    key: string;
    flowName: string;
    inputHash: string;
    modelVersion: string;
    output: any;
    createdAt: Date;
    expiresAt: Date;
};

export const aiCacheService = {
    /**
     * Generates a deterministic cache key for a given input + flow.
     */
    generateKey(flowName: string, input: any, modelVersion: string): string {
        // Sort keys to ensure deterministic stringify
        const normalizedInput = JSON.stringify(input, Object.keys(input).sort());
        const hash = createHash('sha256').update(normalizedInput).digest('hex');
        return `${flowName}_${modelVersion}_${hash}`;
    },

    /**
     * Retrieves a valid cached response if it exists.
     */
    async get(flowName: string, input: any, modelVersion: string): Promise<AIResponseCacheEntry | null> {
        try {
            if (process.env.NEXT_PUBLIC_IS_CI === 'true') return null; // Disable cache in CI

            const key = this.generateKey(flowName, input, modelVersion);
            const db = getAdminDb();
            const docRef = db.collection('ai_cache').doc(key);
            const doc = await docRef.get();

            if (!doc.exists) return null;

            const data = doc.data() as AIResponseCacheEntry;

            // Check for expiration
            const expiresAt = (data.expiresAt as any).toDate ? (data.expiresAt as any).toDate() : data.expiresAt;
            if (expiresAt < new Date()) {
                await docRef.delete(); // Cleanup expired
                return null;
            }

            return data;
        } catch (error) {
            console.warn(`[AICache] Get failed for ${flowName}:`, error);
            return null;
        }
    },

    /**
     * Saves a response to the cache.
     */
    async set(flowName: string, input: any, modelVersion: string, output: any, ttlSeconds: number = 3600 * 24): Promise<void> {
        try {
            if (process.env.NEXT_PUBLIC_IS_CI === 'true') return;

            const key = this.generateKey(flowName, input, modelVersion);
            const now = new Date();
            const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);

            const entry: Omit<AIResponseCacheEntry, 'createdAt' | 'expiresAt'> & { createdAt: Date, expiresAt: Date } = {
                key,
                flowName,
                inputHash: key.split('_').pop()!,
                modelVersion,
                output,
                createdAt: now,
                expiresAt
            };

            const db = getAdminDb();
            // Use set with merge to be safe, though key uniqueness should handle it
            await db.collection('ai_cache').doc(key).set(entry);
        } catch (error) {
            console.warn(`[AICache] Set failed for ${flowName}:`, error);
        }
    }
};
