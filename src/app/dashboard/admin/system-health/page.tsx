import React, { Suspense } from 'react';
import SystemHealthClient from './system-health-client';
import { Loader2 } from 'lucide-react';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'System Health | Admin',
    description: 'Platform observability and health monitoring.'
};

export default function SystemHealthPage() {
    return (
        <Suspense fallback={<div className="p-10 flex justify-center"><Loader2 className="animate-spin" /></div>}>
            <SystemHealthClient />
        </Suspense>
    );
}
