import React, { Suspense } from 'react';
import { Loader2 } from "lucide-react";
import MyBidsClient from './my-bids-client';

export const dynamic = 'force-dynamic';

export default function MyBidsPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        }>
            <MyBidsClient />
        </Suspense>
    );
}
