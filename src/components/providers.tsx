
"use client";

import { HelpProvider } from "@/hooks/use-help";
import { useFcm } from "@/hooks/use-fcm";

// This small component exists to ensure the useFcm hook is called *within* the UserProvider context
const FcmInitializer = () => {
    useFcm();
    return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <HelpProvider>
            <FcmInitializer />
            {children}
        </HelpProvider>
    )
}
