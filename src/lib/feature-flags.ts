
import { getAdminDb } from "@/infrastructure/firebase/admin";

export type FeatureFlagKey = 'ENABLE_PAYMENTS' | 'ENABLE_AI_GENERATION' | 'ENABLE_DISPUTES_V2';

export const DEFAULT_FLAGS: Record<FeatureFlagKey, boolean> = {
    'ENABLE_PAYMENTS': true,
    'ENABLE_AI_GENERATION': true,
    'ENABLE_DISPUTES_V2': true,
};

// SERVER-SIDE Usage
export async function getFeatureFlag(key: FeatureFlagKey): Promise<boolean> {
    try {
        const db = getAdminDb();
        const docRef = db.collection('feature_flags').doc(key);
        const docSnap = await docRef.get();

        if (docSnap.exists) {
            return docSnap.data()?.isEnabled ?? DEFAULT_FLAGS[key];
        }
        return DEFAULT_FLAGS[key];
    } catch (error) {
        console.error(`[FeatureFlag] Failed to fetch flag ${key}:`, error);
        return DEFAULT_FLAGS[key];
    }
}
