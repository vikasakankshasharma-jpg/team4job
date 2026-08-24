import React, { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { DealerAnalyticsClient } from './dealer-analytics-client';
import { getDealerOperationalKPIsAction, getDealerFinancialKPIsAction } from '@/app/actions/analytics.actions';

export const dynamic = 'force-dynamic';

export default async function AnalyticsPage() {
    const operationalKPIs = await getDealerOperationalKPIsAction().catch(() => null);
    const financialKPIs = await getDealerFinancialKPIsAction().catch(() => null);

    return (
        <div className="max-w-6xl mx-auto p-6">
            <div className="mb-8">
                <h1 className="text-3xl font-bold">Analytics & KPIs</h1>
                <p className="text-muted-foreground mt-1">Review your operational velocity and private financials based on immutable events.</p>
            </div>
            
            <Suspense fallback={<div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>}>
                <DealerAnalyticsClient 
                    initialOperational={operationalKPIs} 
                    initialFinancial={financialKPIs} 
                />
            </Suspense>
        </div>
    );
}
