'use client';

import React, { useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCcw, Home } from "lucide-react";
import Link from 'next/link';

export default function JobDetailError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to the console for E2E collectors
        console.error('[JobDetailError] SSR Failure:', error.message, error.digest);
    }, [error]);

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center space-y-6">
            <div className="h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center text-destructive mb-4">
                <AlertCircle className="h-10 w-10" />
            </div>
            
            <div className="space-y-2">
                <h1 className="text-3xl font-black italic uppercase tracking-tighter">
                    Act Failure: SSR Crash
                </h1>
                <p className="text-muted-foreground max-w-md mx-auto font-medium">
                    The job detail page encountered a fatal server-side error. 
                </p>
            </div>

            <div className="p-4 bg-muted/50 rounded-lg border text-left max-w-2xl w-full overflow-hidden">
                <p className="text-[10px] font-black uppercase text-muted-foreground/50 mb-2">Diagnostic Data</p>
                <code className="text-xs break-all font-mono text-destructive dark:text-red-400" data-testid="ssr-error-message">
                    {error.message || 'Unknown Server Error'}
                </code>
                {error.digest && (
                    <p className="text-[10px] mt-2 font-mono opacity-40">Digest: {error.digest}</p>
                )}
            </div>

            <div className="flex items-center gap-4 pt-4">
                <Button 
                    onClick={() => reset()} 
                    variant="default"
                    className="rounded-full px-8"
                    data-testid="ssr-retry-button"
                >
                    <RefreshCcw className="mr-2 h-4 w-4" />
                    Retry SSR
                </Button>
                <Link href="/dashboard">
                    <Button variant="outline" className="rounded-full px-8">
                        <Home className="mr-2 h-4 w-4" />
                        Dashboard
                    </Button>
                </Link>
            </div>
        </div>
    );
}
