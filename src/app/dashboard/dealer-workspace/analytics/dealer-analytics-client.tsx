'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Clock, CheckCircle2, AlertTriangle, DollarSign, Activity } from 'lucide-react';

export function DealerAnalyticsClient({ initialOperational, initialFinancial }: { initialOperational: any, initialFinancial: any }) {
    
    if (!initialOperational || !initialFinancial) {
        return <div className="text-red-500">Failed to load analytics data.</div>;
    }

    const op = initialOperational;
    const fin = initialFinancial;

    return (
        <div className="space-y-8">
            
            <section>
                <h2 className="text-xl font-semibold mb-4 flex items-center">
                    <Activity className="mr-2 h-5 w-5" /> Operational Velocity
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Total Jobs Created</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{op.totalJobsCreated}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Match ? Award Rate</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{op.matchToAwardRate.toFixed(1)}%</div>
                            <p className="text-xs text-muted-foreground mt-1">({op.jobsAwarded} awarded)</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Award ? Complete Rate</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{op.awardToCompletionRate.toFixed(1)}%</div>
                            <p className="text-xs text-muted-foreground mt-1">({op.jobsCompleted} completed)</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Disputed Jobs</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-red-600 flex items-center">
                                {op.jobsDisputed}
                                {op.jobsDisputed > 0 && <AlertTriangle className="ml-2 h-5 w-5" />}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </section>

            <section>
                <h2 className="text-xl font-semibold mb-4 flex items-center">
                    <Clock className="mr-2 h-5 w-5" /> Fulfillment Averages
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="text-sm font-medium text-muted-foreground mb-1">Time to Award</div>
                            <div className="text-2xl font-bold">{op.avgTimeToAwardHrs.toFixed(1)} hrs</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="text-sm font-medium text-muted-foreground mb-1">Time to Completion</div>
                            <div className="text-2xl font-bold">{op.avgTimeToCompletionHrs.toFixed(1)} hrs</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="text-sm font-medium text-muted-foreground mb-1">Payment Release Time</div>
                            <div className="text-2xl font-bold">{op.avgPaymentReleaseHrs.toFixed(1)} hrs</div>
                        </CardContent>
                    </Card>
                </div>
            </section>

            <section className="bg-slate-50 p-6 rounded-xl border">
                <h2 className="text-xl font-semibold mb-4 flex items-center text-slate-800">
                    <DollarSign className="mr-2 h-5 w-5" /> Dealer Private Financials
                </h2>
                <p className="text-sm text-slate-500 mb-6">This data is strictly isolated. No other dealer or installer can view your margins or revenue.</p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
                        <div className="text-sm font-medium text-slate-500 mb-1">Total GMV (Revenue)</div>
                        <div className="text-3xl font-bold text-slate-900">?{fin.totalRevenue.toLocaleString()}</div>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
                        <div className="text-sm font-medium text-slate-500 mb-1">Installer Payouts</div>
                        <div className="text-3xl font-bold text-slate-900">?{fin.totalInstallerPayouts.toLocaleString()}</div>
                    </div>
                    <div className="bg-emerald-50 p-4 rounded-lg shadow-sm border border-emerald-200">
                        <div className="text-sm font-medium text-emerald-700 mb-1">Gross Margin</div>
                        <div className="text-3xl font-bold text-emerald-800">?{fin.totalMargin.toLocaleString()}</div>
                    </div>
                </div>
            </section>

        </div>
    );
}
