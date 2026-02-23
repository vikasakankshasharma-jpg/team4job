
import { doc, onSnapshot } from "firebase/firestore";
import { useState, useEffect } from "react";
import { useFirebase } from "@/hooks/use-user";

export type FeatureFlagKey = 'ENABLE_PAYMENTS' | 'ENABLE_AI_GENERATION' | 'ENABLE_DISPUTES_V2';

export const DEFAULT_FLAGS: Record<FeatureFlagKey, boolean> = {
    'ENABLE_PAYMENTS': true,
    'ENABLE_AI_GENERATION': true,
    'ENABLE_DISPUTES_V2': true,
};

// CLIENT-SIDE Hook
export function useFeatureFlag(key: FeatureFlagKey): boolean {
    const [isEnabled, setIsEnabled] = useState(DEFAULT_FLAGS[key]);
    const { db } = useFirebase();

    useEffect(() => {
        if (!db) return;
        
        // Disable real-time feature flags in E2E mode to prevent Firestore assertion errors
        const isE2EMode = process.env.NEXT_PUBLIC_E2E === 'true';
        if (isE2EMode) {
            console.log('[useFeatureFlag] E2E mode detected - using default flag value');
            return;
        }

        const ref = doc(db, 'feature_flags', key);
        const unsubscribe = onSnapshot(ref, (snap) => {
            if (snap.exists()) {
                setIsEnabled(snap.data()?.isEnabled ?? DEFAULT_FLAGS[key]);
            } else {
                setIsEnabled(DEFAULT_FLAGS[key]);
            }
        }, (error) => {
            console.error(`Error fetching feature flag ${key}:`, error);
            setIsEnabled(DEFAULT_FLAGS[key]);
        });

        return unsubscribe;
    }, [db, key]);

    return isEnabled;
}
