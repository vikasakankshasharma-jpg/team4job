
import React, { Suspense } from 'react';
import { Loader2 } from "lucide-react";
import SubscriptionPlansClient from './subscription-plans-client';

export const dynamic = 'force-dynamic';

export default function SubscriptionPlansPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin" />
            </div>
        }>
            <SubscriptionPlansClient />
        </Suspense>
    );
}
