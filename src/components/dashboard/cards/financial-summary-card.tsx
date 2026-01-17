"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Transaction } from "@/lib/types";

export function FinancialSummaryCard({ transactions }: { transactions: Transaction[] }) {
    const summary = React.useMemo(() => {
        return transactions.reduce((acc, t) => {
            if (t.status === 'Released') {
                acc.totalReleased += t.payoutToInstaller;
                acc.platformRevenue += t.commission + t.jobGiverFee;
            }
            if (t.status === 'Funded') {
                acc.fundsHeld += t.totalPaidByGiver;
            }
            if (t.status === 'Funded' || t.status === 'Released') {
                acc.totalVolume += t.totalPaidByGiver;
            }
            return acc;
        }, {
            totalVolume: 0,
            totalReleased: 0,
            platformRevenue: 0,
            fundsHeld: 0,
        });
    }, [transactions]);

    return (
        <Card className="col-span-full">
            <CardHeader>
                <CardTitle>Financial Summary</CardTitle>
                <CardDescription>A real-time overview of financial activities on the platform.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <Card className="p-4">
                    <p className="text-sm font-medium">Total Volume</p>
                    <p className="text-2xl font-bold">₹{summary.totalVolume.toLocaleString()}</p>
                </Card>
                <Card className="p-4">
                    <p className="text-sm font-medium">Platform Revenue</p>
                    <p className="text-2xl font-bold text-green-600">₹{summary.platformRevenue.toLocaleString()}</p>
                </Card>
                <Card className="p-4">
                    <p className="text-sm font-medium">Funds Released</p>
                    <p className="text-2xl font-bold">₹{summary.totalReleased.toLocaleString()}</p>
                </Card>
                <Card className="p-4">
                    <p className="text-sm font-medium">Funds Held</p>
                    <p className="text-2xl font-bold">₹{summary.fundsHeld.toLocaleString()}</p>
                </Card>
            </CardContent>
        </Card>
    )
}
