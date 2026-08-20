import { Metadata } from "next";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

const StitchAdminAnalytics = dynamic(
    () => import("@/components/dashboard/stitch-admin-analytics").then((mod) => mod.StitchAdminAnalytics),
    {
        loading: () => (
            <div className="flex h-screen items-center justify-center bg-slate-950">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        ),
    }
);

export const metadata: Metadata = {
    title: "Admin Analytics | Team4Job",
    description: "Advanced analytics and platform health dashboard",
};

export default function AdminAnalyticsPage() {
    return <StitchAdminAnalytics />;
}
