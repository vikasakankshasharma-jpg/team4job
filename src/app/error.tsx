"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCcw, Home } from "lucide-react";
import Link from "next/link";
import * as Sentry from "@sentry/nextjs";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to Sentry
        Sentry.captureException(error);
        console.error("Application Error Boundary:", error);
    }, [error]);

    return (
        <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4 text-center">
            {/* Background Decorative Elements */}
            <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-destructive/5 blur-3xl" />
            <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-destructive/10 blur-3xl" />

            <div className="relative z-10 flex flex-col items-center animate-in fade-in slide-in-from-bottom-10 duration-700">
                <div className="mb-8 flex h-28 w-28 items-center justify-center rounded-3xl bg-gradient-to-br from-destructive/20 to-destructive/5 shadow-2xl shadow-destructive/20 backdrop-blur-sm">
                    <AlertCircle className="h-14 w-14 text-destructive animate-bounce" />
                </div>
                
                <h1 className="mb-4 text-4xl font-black tracking-tight text-foreground sm:text-5xl">
                    Something went wrong
                </h1>
                
                <p className="mb-10 max-w-md text-lg text-muted-foreground leading-relaxed">
                    An unexpected error occurred. Don&apos;t worry, our team has been notified and we&apos;re looking into it.
                </p>
                
                <div className="flex flex-col gap-4 sm:flex-row">
                    <Button
                        variant="outline"
                        onClick={() => reset()}
                        className="group gap-2 px-8 py-6 text-lg transition-all hover:bg-destructive/5"
                    >
                        <RefreshCcw className="h-5 w-5 transition-transform group-hover:rotate-180 duration-500" />
                        Try Again
                    </Button>
                    <Button asChild className="group gap-2 px-8 py-6 text-lg shadow-xl shadow-primary/20">
                        <Link href="/">
                            <Home className="h-5 w-5 transition-transform group-hover:scale-110" />
                            Return Home
                        </Link>
                    </Button>
                </div>

                {error.digest && (
                    <div className="mt-12 inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-4 py-1 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                        <span className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse" />
                        Error ID: {error.digest}
                    </div>
                )}
            </div>
        </div>
    );
}
