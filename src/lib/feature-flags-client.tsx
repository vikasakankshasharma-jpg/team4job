"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { db } from '@/infrastructure/firebase/client';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { logger } from '@/infrastructure/logger';

export type FeatureFlags = {
    [key: string]: boolean;
};

// Define your default flags here
export const defaultFlags: FeatureFlags = {
    enable_ai_scoping: false,
    enable_beta_reports: false,
    enable_discord_alerts: true,
};

const FeatureFlagContext = createContext<FeatureFlags>(defaultFlags);

export function FeatureFlagProvider({ children }: { children: React.ReactNode }) {
    const [flags, setFlags] = useState<FeatureFlags>(defaultFlags);

    useEffect(() => {
        if (!db) return;
        
        const docRef = doc(db, 'config', 'feature_flags');
        
        // Listen in real-time to Firestore config document
        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                setFlags({ ...defaultFlags, ...docSnap.data() });
            } else {
                // Seed defaults if document doesn't exist
                setDoc(docRef, defaultFlags).catch(err => 
                    logger.error("Failed to seed default feature flags", err)
                );
            }
        }, (error) => {
            logger.error("Error fetching feature flags", error);
        });

        return () => unsubscribe();
    }, []);

    return (
        <FeatureFlagContext.Provider value={flags}>
            {children}
        </FeatureFlagContext.Provider>
    );
}

/**
 * Hook to consume a feature flag. Returns boolean.
 * @param flagName The key of the feature flag
 */
export function useFeatureFlag(flagName: string): boolean {
    const flags = useContext(FeatureFlagContext);
    return !!flags[flagName];
}

export function useAllFeatureFlags(): FeatureFlags {
    return useContext(FeatureFlagContext);
}

/**
 * Server/Client helper to toggle a flag in Firestore.
 */
export async function toggleFeatureFlag(flagName: string, value: boolean) {
    if (!db) return;
    const docRef = doc(db, 'config', 'feature_flags');
    try {
        await setDoc(docRef, { [flagName]: value }, { merge: true });
        logger.info(`Feature flag ${flagName} toggled to ${value}`);
    } catch (error) {
        logger.error(`Failed to toggle feature flag ${flagName}`, error);
        throw error;
    }
}
