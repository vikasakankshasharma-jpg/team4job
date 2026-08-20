
"use client";

import { HelpProvider } from "@/hooks/use-help";
import { useFcm } from "@/hooks/use-fcm";
import { QueryProvider } from "@/providers/query-provider";
import { FeatureFlagProvider } from "@/lib/feature-flags";

import { useEffect } from "react";

// This small component exists to ensure the useFcm hook is called *within* the UserProvider context
const FcmInitializer = () => {
    useFcm();
    return null;
}

const HydrationMarker = () => {
    useEffect(() => {
        document.body.setAttribute('data-hydrated', 'true');
    }, []);
    return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <QueryProvider>
            <HelpProvider>
                <FeatureFlagProvider>
                    <FcmInitializer />
                    <HydrationMarker />
                    {children}
                </FeatureFlagProvider>
            </HelpProvider>
        </QueryProvider>
    )
}

