
import React, { Suspense } from 'react';
import { Loader2 } from "lucide-react";
import DashboardClient from './dashboard-client';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'Dashboard | Team4Job',
    description: 'Manage your jobs, bids, and transactions',
};

export default function DashboardPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin" />
            </div>
        }>
            <DashboardClient />
        </Suspense>
    );
}
