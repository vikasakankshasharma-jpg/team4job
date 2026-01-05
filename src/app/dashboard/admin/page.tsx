
import React, { Suspense } from 'react';
import { Loader2 } from "lucide-react";
import AdminClient from './admin-client';

export const dynamic = 'force-dynamic';

export default function AdminDashboardPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin" />
            </div>
        }>
            <AdminClient />
        </Suspense>
    );
}
