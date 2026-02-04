"use client";

import dynamic from "next/dynamic";
import { Card } from "@/components/ui/card";
import { IndianRupee, Clock } from "lucide-react";

const InstallerEarningsChart = dynamic(() => import("@/components/dashboard/charts/installer-earnings-chart").then(mod => mod.InstallerEarningsChart), { ssr: false });

interface InstallerChartsClientProps {
    earningsData: any[];
    totalEarnings: number;
    pendingPayments: number;
}

export function InstallerChartsClient({ earningsData, totalEarnings, pendingPayments }: InstallerChartsClientProps) {
    return (
        <div className="mt-8 grid gap-4 md:grid-cols-3">
            <InstallerEarningsChart data={earningsData} />

            <div className="flex flex-col gap-4">
                <Card className="flex flex-col justify-center items-center text-center p-6 bg-green-50 dark:bg-green-950/20 border-green-100 dark:border-green-900 flex-1">
                    <div className="p-4 rounded-full bg-green-200 dark:bg-green-900 mb-4">
                        <IndianRupee className="h-8 w-8 text-green-700 dark:text-green-400" />
                    </div>
                    <p className="text-sm font-medium text-green-600 dark:text-green-400">Total Earnings</p>
                    <h3 className="text-4xl font-bold mt-2 text-green-800 dark:text-green-300">₹{totalEarnings.toLocaleString()}</h3>
                    <p className="text-xs text-muted-foreground mt-2">Lifetime payout processed</p>
                </Card>

                <Card className="flex flex-col justify-center items-center text-center p-6 bg-blue-50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900 flex-1">
                    <div className="p-4 rounded-full bg-blue-200 dark:bg-blue-900 mb-4">
                        <Clock className="h-8 w-8 text-blue-700 dark:text-blue-400" />
                    </div>
                    <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Projected Earnings</p>
                    <h3 className="text-4xl font-bold mt-2 text-blue-800 dark:text-blue-300">₹{pendingPayments.toLocaleString()}</h3>
                    <p className="text-xs text-muted-foreground mt-2">Funds currently Locked</p>
                </Card>
            </div>
        </div>
    );
}
