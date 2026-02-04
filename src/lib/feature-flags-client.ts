
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
export function useFeatureFlag(key: FeatureFlagKey) {
    const { db } = useFirebase();
    const [isEnabled, setIsEnabled] = useState<boolean>(DEFAULT_FLAGS[key]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!db) return;

        const ref = doc(db, 'feature_flags', key);
        const unsubscribe = onSnapshot(ref, (snap) => {
            if (snap.exists()) {
                setIsEnabled(snap.data()?.isEnabled ?? DEFAULT_FLAGS[key]);
            } else {
                setIsEnabled(DEFAULT_FLAGS[key]);
            }
            setLoading(false);
        }, (error) => {
            console.error(`[FeatureFlag] Subscription error for ${key}:`, error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [db, key]);

    return { isEnabled, loading };
}
