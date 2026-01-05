"use client";

import { ShieldCheck } from "lucide-react";

export default function Loading() {
    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="relative flex items-center justify-center">
                <div className="absolute h-16 w-16 animate-ping rounded-full bg-primary/20" />
                <div className="absolute h-24 w-24 animate-pulse rounded-full border-2 border-primary/20" />
                <ShieldCheck className="h-12 w-12 animate-pulse text-primary" />
            </div>
            <p className="mt-8 text-sm font-medium animate-pulse text-muted-foreground tracking-widest uppercase">
                CCTV Job Connect
            </p>
            <div className="mt-2 h-1 w-24 overflow-hidden rounded-full bg-muted">
                <div className="h-full w-full origin-left animate-progress bg-primary" />
            </div>
        </div>
    );
}
