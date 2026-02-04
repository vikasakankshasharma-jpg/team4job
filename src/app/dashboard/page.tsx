
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
import { JobGiverServerView } from '@/components/dashboard/server/job-giver-view';
import { InstallerServerView } from '@/components/dashboard/server/installer-view';

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

    // Role-based Server Rendering
    if (user.role === 'Job Giver') {
        // Map domain User to UI User (lib/types)
        const uiUser = {
            ...user,
            roles: [user.role],
        } as any; // Cast to any/User to avoid strict type mismatch on slight interface differences

        return <JobGiverServerView user={uiUser} />;
    }

    if (user.role === 'Installer') {
        // Map domain User to UI User (lib/types)
        const uiUser = {
            ...user,
            roles: [user.role],
        } as any;

        return <InstallerServerView user={uiUser} />;
    }

    // Fallback for other roles (Phase 3 can migrate them)
    // We need to fetch formatted data for legacy DashboardClient if we want to avoid client waterfall?
    // Or just let DashboardClient handle it for now to minimize risk.

    // Legacy fetching for non-Job Giver roles:
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
