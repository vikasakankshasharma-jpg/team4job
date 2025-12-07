
import React, { Suspense } from 'react';
import { Loader2 } from "lucide-react";
import CouponsClient from './coupons-client';

export const dynamic = 'force-dynamic';

export default function CouponsPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin" />
            </div>
        }>
            <CouponsClient />
        </Suspense>
    );
}
