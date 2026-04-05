"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
    return (
        <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4 text-center">
            {/* Background Decorative Elements */}
            <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
            <div className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
            
            <div className="relative z-10 flex flex-col items-center animate-in fade-in zoom-in duration-700">
                <div className="mb-8 flex h-28 w-28 items-center justify-center rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 shadow-2xl shadow-primary/20 backdrop-blur-sm">
                    <ShieldAlert className="h-14 w-14 text-primary animate-pulse" />
                </div>
                
                <h1 className="mb-2 bg-gradient-to-t from-muted-foreground to-foreground bg-clip-text text-8xl font-black tracking-tighter text-transparent sm:text-9xl">
                    404
                </h1>
                
                <h2 className="mb-6 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                    Lost in Space?
                </h2>
                
                <p className="mb-10 max-w-sm text-lg text-muted-foreground leading-relaxed">
                    This page seems to have vanished. Let&apos;s get you back to familiar territory.
                </p>
                
                <div className="flex flex-col gap-4 sm:flex-row">
                    <Button variant="ghost" asChild className="group gap-2 px-8 py-6 text-lg">
                        <Link href="/">
                            <Home className="h-5 w-5 transition-transform group-hover:scale-110" />
                            Home
                        </Link>
                    </Button>
                    <Button asChild className="group gap-2 px-8 py-6 text-lg shadow-xl shadow-primary/20 transition-all hover:shadow-primary/30 active:scale-95">
                        <Link href="/login">
                            <ArrowLeft className="h-5 w-5 transition-transform group-hover:-translate-x-1" />
                            Sign In
                        </Link>
                    </Button>
                </div>
            </div>

            <p className="absolute bottom-8 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground/30">
                Team4Job &bull; Security Verified
            </p>
        </div>
    );
}
