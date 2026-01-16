import { Metadata } from "next";
import AnalyticsClient from "./analytics-client";

export const metadata: Metadata = {
    title: "Analytics | Team4Job",
    description: "View your hiring performance and spending trends",
};

export default function AnalyticsPage() {
    return <AnalyticsClient />;
}
