"use client";

import dynamic from "next/dynamic";

const SpendingHistoryChart = dynamic(() => import("@/components/dashboard/charts/client-charts").then(mod => mod.SpendingHistoryChart), { ssr: false });
const JobStatusChart = dynamic(() => import("@/components/dashboard/charts/client-charts").then(mod => mod.JobStatusChart), { ssr: false });

interface ClientChartsClientProps {
    spendingData: any[];
    totalSpent: number;
    jobStatusData: any[];
}

export function ClientChartsClient({ spendingData, totalSpent, jobStatusData }: ClientChartsClientProps) {
    return (
        <div className="lg:col-span-2 space-y-6">
            <SpendingHistoryChart data={spendingData} totalSpent={totalSpent} />
            <JobStatusChart data={jobStatusData} />
        </div>
    );
}
