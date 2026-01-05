"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
            <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-primary/10">
                <ShieldAlert className="h-12 w-12 text-primary" />
            </div>
            <h1 className="mb-2 text-4xl font-extrabold tracking-tight sm:text-6xl">404</h1>
            <h2 className="mb-6 text-2xl font-semibold text-muted-foreground">Page Not Found</h2>
            <p className="mb-10 max-w-md text-muted-foreground leading-relaxed">
                The page you are looking for doesn&apos;t exist or has been moved. Check the URL or use the navigation below to get back on track.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row">
                <Button variant="outline" asChild className="gap-2">
                    <Link href="/">
                        <Home className="h-4 w-4" />
                        Home
                    </Link>
                </Button>
                <Button asChild className="gap-2 shadow-lg shadow-primary/20">
                    <Link href="/dashboard">
                        <ArrowLeft className="h-4 w-4" />
                        Back to Dashboard
                    </Link>
                </Button>
            </div>
        </div>
    );
}
