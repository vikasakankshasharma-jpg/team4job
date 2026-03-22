"use client";

import React, { useEffect, useState } from 'react';
import { useFirebase } from '@/infrastructure/firebase/client-provider';
import { doc, onSnapshot } from 'firebase/firestore';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Info, Ticket } from 'lucide-react';
import { cn } from '@/lib/utils';

// Schema: system_status/global
// {
//    status: 'operational' | 'degraded' | 'maintenance',
//    message: 'Payment gateway is experiencing delays.',
//    affectedServices: ['payments'],
//    lastUpdated: Timestamp
// }

export function SystemStatusBanner() {
    const { db } = useFirebase();
    const [status, setStatus] = useState<any>(null);

    useEffect(() => {
        if (!db) return;
        
        // Disable real-time system status listener in E2E mode to prevent Firestore assertion errors
        const isE2EMode = process.env.NEXT_PUBLIC_E2E === 'true';
        if (isE2EMode) {
            return;
        }
        
        const ref = doc(db, 'system_status', 'global');
        return onSnapshot(ref, (snap) => {
            if (snap.exists()) {
                setStatus(snap.data());
            } else {
                setStatus(null);
            }
        }, (error) => {
            // Suppress permission errors in console for cleaner logs (optional)
            // console.warn("SystemStatusBanner: Failed to fetch status", error);
            setStatus(null);
        });
    }, [db]);

    if (!status || status.status === 'operational') return null;

    const isMaintenance = status.status === 'maintenance';

    return (
        <div className={cn(
            "w-full px-4 py-2 text-center text-sm font-medium",
            isMaintenance ? "bg-red-600 text-white" : "bg-amber-500 text-white"
        )}>
            <div className="container mx-auto flex items-center justify-center gap-2">
                {isMaintenance ? <Ticket className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                <span>{status.message}</span>
            </div>
        </div>
    );
}
