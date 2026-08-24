import React, { Suspense } from 'react';
import { Loader2 } from "lucide-react";
import DealerCommandCenter from '@/components/dealer/DealerCommandCenter';

export const dynamic = 'force-dynamic';

import { getUserIdFromSession } from '@/lib/auth-server';
import { getDealerDashboardStatsAction } from '@/app/actions/dashboard.actions';

export default async function DealerWorkspacePage() {
    const userId = await getUserIdFromSession();
    let initialStats = undefined;

    if (userId) {
        const result = await getDealerDashboardStatsAction(userId);
        if (result.success && result.data) {
            initialStats = result.data;
        }
    }

    return (
        <Suspense fallback={
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin" />
            </div>
        }>
            <DealerCommandCenter initialStats={initialStats} />
        </Suspense>
    );
}
