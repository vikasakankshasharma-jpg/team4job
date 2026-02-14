"use client";

import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { useUser } from "@/hooks/use-user";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export default function OnboardingPage() {
    const { user, loading } = useUser();
    const router = useRouter();

    useEffect(() => {
        if (!loading && user) {
            // Correct check: Redirect if NOT an installer OR if already verified (optional, maybe they want to edit)
            // For now, let's assume this page is accessible to any Installer who needs to complete their profile.
            if (!user.roles.includes('Installer')) {
                router.push('/dashboard');
            }
        }
    }, [user, loading, router]);

    if (loading) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div className="container max-w-4xl py-10">
            <div className="mb-8 text-center">
                <h1 className="text-3xl font-bold tracking-tight">Partner Onboarding</h1>
                <p className="text-muted-foreground mt-2">Complete your profile to start receiving jobs.</p>
            </div>
            <OnboardingWizard />
        </div>
    );
}
