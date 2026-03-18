"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Transaction } from "@/lib/types";

import { useTranslations } from 'next-intl';

export function FinancialSummaryCard({ transactions }: { transactions: Transaction[] }) {
    const t = useTranslations('admin.financials');
    const summary = React.useMemo(() => {
        return transactions.reduce((acc, t) => {
            if (t.status === 'released') {
                acc.totalReleased += t.payoutToProfessional;
                acc.platformRevenue += (t.commission || 0) + (t.clientFee || 0);
            }
            if (t.status === 'funded') {
                acc.fundsHeld += t.totalPaidByClient;
            }
            if (t.status === 'funded' || t.status === 'released') {
                acc.totalVolume += t.totalPaidByClient;
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
                <CardTitle>{t('title')}</CardTitle>
                <CardDescription>A real-time overview of financial activities on the platform.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <Card className="p-4">
                    <p className="text-sm font-medium">{t('totalVolume')}</p>
                    <p className="text-2xl font-bold">₹{summary.totalVolume.toLocaleString()}</p>
                </Card>
                <Card className="p-4">
                    <p className="text-sm font-medium">{t('revenue')}</p>
                    <p className="text-2xl font-bold text-green-600">₹{summary.platformRevenue.toLocaleString()}</p>
                </Card>
                <Card className="p-4">
                    <p className="text-sm font-medium">{t('released')}</p>
                    <p className="text-2xl font-bold">₹{summary.totalReleased.toLocaleString()}</p>
                </Card>
                <Card className="p-4">
                    <p className="text-sm font-medium">{t('held')}</p>
                    <p className="text-2xl font-bold">₹{summary.fundsHeld.toLocaleString()}</p>
                </Card>
            </CardContent>
        </Card>
    )
}

