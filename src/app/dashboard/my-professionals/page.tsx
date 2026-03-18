
import React, { Suspense } from 'react';
import { Loader2 } from "lucide-react";
import MyProfessionalsClient from './my-professionals-client';

export const dynamic = 'force-dynamic';

import { getUserIdFromSession } from '@/lib/auth-server';
import { getRelatedProfessionalsAction } from '@/app/actions/user.actions';
import { User } from '@/lib/types';

export default async function MyProfessionalsPage() {
    const userId = await getUserIdFromSession();
    let initialProfessionals: User[] = [];

    if (userId) {
        const res = await getRelatedProfessionalsAction(userId);
        if (res.success && res.Professionals) {
            initialProfessionals = res.Professionals;
        }
    }

    return (
        <Suspense fallback={
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin" />
            </div>
        }>
            <MyProfessionalsClient initialProfessionals={initialProfessionals} />
        </Suspense>
    );
}
