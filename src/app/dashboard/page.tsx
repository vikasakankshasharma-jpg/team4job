
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

import { userService } from '@/domains/users/user.service';

export default async function DashboardPage() {
    const userId = await getUserIdFromSession();

    // We fetch full user to get role/name
    let user = null;
    if (userId) {
        try {
            user = await userService.getProfile(userId);
        } catch (e) {
            // Handle error or redirect
        }
    }

    if (!user) {
        // Fallback or Redirect? DashboardClient handles loading state
        return (
            <Suspense fallback={
                <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-6 w-6 animate-spin" />
                </div>
            }>
                <DashboardClient initialData={undefined} />
            </Suspense>
        );
    }

    // Fetch dashboard stats for the legacy client-side rendering path
    // NOTE: JobGiverServerView and InstallerServerView are disabled due to
    // "Functions cannot be passed to Client Components" serialization errors.
    // Using the battle-tested DashboardClient as a stable fallback.
    let initialData = undefined;
    const result = await getDashboardStatsAction(userId!);
    if (result.success) {
        initialData = result.data;
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
