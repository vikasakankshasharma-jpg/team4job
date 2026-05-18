
import { doc, onSnapshot } from "firebase/firestore";
import { useState, useEffect } from "react";
import { useFirebase } from "@/infrastructure/firebase/client-provider";

export type FeatureFlagKey = 
  | 'ENABLE_PAYMENTS' 
  | 'ENABLE_AI_GENERATION' 
  | 'ENABLE_DISPUTES_V2'
  | 'case_mgmt_v1'
  | 'triage_v1'
  | 'finops_v1';

export const DEFAULT_FLAGS: Record<FeatureFlagKey, boolean> = {
    'ENABLE_PAYMENTS': true,
    'ENABLE_AI_GENERATION': true,
    'ENABLE_DISPUTES_V2': true,
    'case_mgmt_v1': true,
    'triage_v1': true,
    'finops_v1': true,
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
            setIsEnabled(DEFAULT_FLAGS[key]);
        });

        return unsubscribe;
    }, [db, key]);

    return isEnabled;
}
