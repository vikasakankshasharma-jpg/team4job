
import React, { Suspense } from 'react';
import { Loader2 } from "lucide-react";
import SettingsClient from './settings-client';

export const dynamic = 'force-dynamic';

export default function SettingsPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin" />
            </div>
        }>
            <SettingsClient />
        </Suspense>
    );
}
