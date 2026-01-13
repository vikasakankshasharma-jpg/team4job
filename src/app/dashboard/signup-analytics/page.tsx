import { Metadata } from "next";
import SignupAnalyticsClient from "./signup-analytics-client";

export const metadata: Metadata = {
    title: "Signup Analytics | Admin Dashboard",
    description: "View signup funnel metrics and conversion analytics",
};

export default function SignupAnalyticsPage() {
    return <SignupAnalyticsClient />;
}
