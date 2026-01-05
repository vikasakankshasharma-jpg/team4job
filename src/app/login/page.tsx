import React, { Suspense } from 'react';
import { Loader2 } from "lucide-react";
import LoginClient from './login-client';

export const dynamic = 'force-dynamic';

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        }>
            <LoginClient />
        </Suspense>
    );
}
