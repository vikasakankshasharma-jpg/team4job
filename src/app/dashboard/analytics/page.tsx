import { Metadata } from "next";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

const AnalyticsClient = dynamic(() => import("./analytics-client"), {
    loading: () => (
        <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
    ),
});

export const metadata: Metadata = {
    title: "Analytics | Team4Job",
    description: "View your hiring performance and spending trends",
};

export default function AnalyticsPage() {
    return <AnalyticsClient />;
}
