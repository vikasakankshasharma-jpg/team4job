"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCcw, Home } from "lucide-react";
import Link from "next/link";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error("Global Error Boundary caught:", error);
    }, [error]);

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
            <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-destructive/10">
                <AlertCircle className="h-12 w-12 text-destructive" />
            </div>
            <h1 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl text-foreground">
                Something went wrong!
            </h1>
            <p className="mb-10 max-w-md text-muted-foreground leading-relaxed">
                An unexpected error occurred while processing your request. Our team has been notified. You can try to reset the application or go back home.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row">
                <Button
                    variant="outline"
                    onClick={() => reset()}
                    className="gap-2"
                >
                    <RefreshCcw className="h-4 w-4" />
                    Try Again
                </Button>
                <Button asChild className="gap-2 shadow-lg shadow-primary/20">
                    <Link href="/">
                        <Home className="h-4 w-4" />
                        Go to Home
                    </Link>
                </Button>
            </div>
            {error.digest && (
                <p className="mt-12 text-[10px] uppercase tracking-widest text-muted-foreground/40">
                    Error ID: {error.digest}
                </p>
            )}
        </div>
    );
}
