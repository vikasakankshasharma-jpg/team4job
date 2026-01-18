import { Metadata } from "next";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

const SignupAnalyticsClient = dynamic(() => import("./signup-analytics-client"), {
    loading: () => (
        <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
    ),
});

export const metadata: Metadata = {
    title: "Signup Analytics | Admin Dashboard",
    description: "View signup funnel metrics and conversion analytics",
};

export default function SignupAnalyticsPage() {
    return <SignupAnalyticsClient />;
}
