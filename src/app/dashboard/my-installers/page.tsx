
import React, { Suspense } from 'react';
import { Loader2 } from "lucide-react";
import MyInstallersClient from './my-installers-client';

export const dynamic = 'force-dynamic';

import { getUserIdFromSession } from '@/lib/auth-server';
import { getRelatedInstallersAction } from '@/app/actions/user.actions';
import { User } from '@/lib/types';

export default async function MyInstallersPage() {
    const userId = await getUserIdFromSession();
    let initialInstallers: User[] = [];

    if (userId) {
        const res = await getRelatedInstallersAction(userId);
        if (res.success && res.installers) {
            initialInstallers = res.installers;
        }
    }

    return (
        <Suspense fallback={
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin" />
            </div>
        }>
            <MyInstallersClient initialInstallers={initialInstallers} />
        </Suspense>
    );
}
