
import React, { Suspense } from 'react';
import { Loader2 } from "lucide-react";
import ChatClient from './chat-client';

export const dynamic = 'force-dynamic';

export default function MessagesPage() {
    return (
        <div className="h-[calc(100vh-6rem)] w-full"> {/* Adjust height for header */}
            <Suspense fallback={
                <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            }>
                <ChatClient />
            </Suspense>
        </div>
    );
}
