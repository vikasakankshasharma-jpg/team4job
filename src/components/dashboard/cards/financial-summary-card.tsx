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
        <Card className="col-span-full border-none bg-surface-container-low/40 backdrop-blur-3xl rounded-[3.5rem] shadow-[0_40px_100px_rgba(0,0,0,0.15)] ring-1 ring-white/10 overflow-hidden">
            <CardHeader className="p-8 pb-4">
                <CardTitle className="text-sm font-black italic tracking-tighter uppercase text-primary">Financial Command // Summary</CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase tracking-widest opacity-50">A real-time overview of global platform liquidity and revenue.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-8 pt-0">
                <div className="p-8 rounded-[2rem] bg-background/50 border border-white/5 shadow-inner hover:bg-background transition-all group/stat">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-2">{t('totalVolume')}</p>
                    <p className="text-3xl font-black italic tracking-tighter uppercase text-on-surface">₹{summary.totalVolume.toLocaleString()}</p>
                </div>
                <div className="p-8 rounded-[2rem] bg-success/5 border border-success/10 shadow-inner hover:bg-success/10 transition-all group/stat">
                    <p className="text-[10px] font-black uppercase tracking-widest text-success/60 mb-2">{t('revenue')}</p>
                    <p className="text-3xl font-black italic tracking-tighter uppercase text-success">₹{summary.platformRevenue.toLocaleString()}</p>
                </div>
                <div className="p-8 rounded-[2rem] bg-background/50 border border-white/5 shadow-inner hover:bg-background transition-all group/stat">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-2">{t('released')}</p>
                    <p className="text-3xl font-black italic tracking-tighter uppercase text-on-surface">₹{summary.totalReleased.toLocaleString()}</p>
                </div>
                <div className="p-8 rounded-[2rem] bg-amber-500/5 border border-amber-500/10 shadow-inner hover:bg-amber-500/10 transition-all group/stat">
                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-600/60 mb-2">{t('held')}</p>
                    <p className="text-3xl font-black italic tracking-tighter uppercase text-amber-600">₹{summary.fundsHeld.toLocaleString()}</p>
                </div>
            </CardContent>
        </Card>
    )
}

