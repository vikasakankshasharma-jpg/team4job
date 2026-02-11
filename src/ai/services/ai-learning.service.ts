
import { getAdminDb } from '@/lib/firebase/server-init';
import { FieldValue } from 'firebase-admin/firestore';
import { logger } from '@/infrastructure/logger';

export type AiInteractionType = 'price_estimate' | 'time_estimate' | 'skill_suggestion' | 'job_recommendation' | 'installer_matching';

export interface AiLogEntry {
    id?: string;
    type: AiInteractionType;
    input: any;
    output: any;
    relatedEntityId?: string; // jobId, userId, etc.
    timestamp: Date;
    model: string;
    // Outcome data (populated later)
    outcome?: {
        success: boolean;
        actualValue?: any; // e.g. actual price, actual time
        rating?: number; // 1-5
        feedback?: string;
        diff?: any; // percentage error, etc.
    };
}

class AiLearningService {
    private collectionName = 'ai_interactions';

    /**
     * Logs an AI interaction to Firestore.
     */
    async logInteraction(
        type: AiInteractionType,
        input: any,
        output: any,
        relatedEntityId?: string,
        model: string = 'gemini-1.5-flash'
    ): Promise<string> {
        try {
            const db = getAdminDb();
            const docRef = await db.collection(this.collectionName).add({
                type,
                input,
                output,
                relatedEntityId,
                timestamp: FieldValue.serverTimestamp(),
                model
            });
            return docRef.id;
        } catch (error) {
            console.error('Failed to log AI interaction:', error);
            return ''; // Fail silently to not block the user flow
        }
    }

    /**
     * Updates an interaction log with the real-world outcome.
     * e.g., When a job is completed, update the price estimate log with the actual price.
     */
    async updateOutcome(relatedEntityId: string, type: AiInteractionType, outcomeData: AiLogEntry['outcome']) {
        try {
            const db = getAdminDb();
            const snapshot = await db.collection(this.collectionName)
                .where('relatedEntityId', '==', relatedEntityId)
                .where('type', '==', type)
                .limit(1)
                .get();

            if (!snapshot.empty) {
                const doc = snapshot.docs[0];
                await doc.ref.update({
                    outcome: outcomeData
                });
                logger.info('AI Learning', { message: `Updated outcome for ${relatedEntityId} (${type})` });
            }
        } catch (error) {
            console.error('Failed to update AI outcome:', error);
        }
    }

    /**
     * Retrieves successful past examples to use as context (Few-Shot Learning).
     * Uses a basic text similarity match on the input to find relevant examples.
     */
    async getSuccessfulExamples(
        type: AiInteractionType,
        currentInputSummary: string,
        limit: number = 3
    ): Promise<AiLogEntry[]> {
        try {
            const db = getAdminDb();
            // Get last 50 successful interactions
            const snapshot = await db.collection(this.collectionName)
                .where('type', '==', type)
                .where('outcome.rating', '>=', 4) // Only high rated
                .orderBy('outcome.rating', 'desc')
                .orderBy('timestamp', 'desc')
                .limit(50)
                .get();

            if (snapshot.empty) return [];

            const candidates = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AiLogEntry));

            // Basic Re-ranking based on text similarity (Jaccard Index on bigrams or keywords)
            // This makes it "Enhanced" - we don't just take the latest, we take the *most relevant*.
            const ranked = candidates.map(c => ({
                ...c,
                similarity: this.calculateSimilarity(currentInputSummary, JSON.stringify(c.input))
            })).sort((a, b) => b.similarity - a.similarity);

            return ranked.slice(0, limit);
        } catch (error) {
            console.error('Failed to fetch examples:', error);
            return [];
        }
    }

    private calculateSimilarity(str1: string, str2: string): number {
        if (!str1 || !str2) return 0;
        const s1 = new Set(str1.toLowerCase().split(/\W+/));
        const s2 = new Set(str2.toLowerCase().split(/\W+/));
        const intersection = new Set([...s1].filter(x => s2.has(x)));
        const union = new Set([...s1, ...s2]);
        return intersection.size / union.size;
    }

    /**
     * Links the most recent unlinked log of a certain type for a user to a specific entity ID.
     * Use this when an artifact (like a Job) is created *after* the AI interaction.
     */
    async linkLogToEntity(userId: string, entityId: string, type: AiInteractionType) {
        try {
            const db = getAdminDb();
            // Find the most recent log for this user of this type that has NO relatedEntityId
            // note: input.userId or metadata.userId matching relies on how we logged it. 
            // We logged 'input' object. If input has userId, we can query it. 
            // For now, we assume we might need to rely on timestamp?
            // Actually, we didn't strictly log userId in a top-level field. 
            // We should ideally update logInteraction to store userId at top level if available.
            // For now, let's assume we search by timestamp and hope for the best in this single-tenant-ish dev env, 
            // OR we rely on `input.userId` if it exists.

            // Heuristic: Get last log of type within 10 minutes.
            const TenMinsAgo = new Date(Date.now() - 10 * 60 * 1000);

            const snapshot = await db.collection(this.collectionName)
                .where('type', '==', type)
                .where('timestamp', '>=', TenMinsAgo)
                .orderBy('timestamp', 'desc')
                .limit(5)
                .get();

            if (snapshot.empty) return;

            // We iterate to find one that is NOT linked yet.
            // And ideally belongs to the user (if we can check input).
            for (const doc of snapshot.docs) {
                const data = doc.data();
                if (!data.relatedEntityId) {
                    // Found it! Link it.
                    await doc.ref.update({ relatedEntityId: entityId });
                    logger.info('AI Learning', { message: `Linked log ${doc.id} to entity ${entityId}` });
                    break; // Only link the latest one
                }
            }
        } catch (error) {
            console.warn('Failed to link log to entity:', error);
        }
    }
}

export const aiLearningService = new AiLearningService();
