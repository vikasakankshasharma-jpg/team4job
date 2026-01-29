
import React, { Suspense } from 'react';
import { Loader2 } from "lucide-react";
import DashboardClient from './dashboard-client';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'Dashboard | Team4Job',
    description: 'Manage your jobs, bids, and transactions',
};

import { getUserIdFromSession } from '@/lib/auth-server';
import { getDashboardStatsAction } from '@/app/actions/dashboard.actions';

export default async function DashboardPage() {
    const userId = await getUserIdFromSession();
    let initialData = undefined;

    if (userId) {
        const result = await getDashboardStatsAction(userId);
        if (result.success) {
            initialData = result.data;
        }
    }

    return (
        <Suspense fallback={
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin" />
            </div>
        }>
            <DashboardClient initialData={initialData} />
        </Suspense>
    );
}
