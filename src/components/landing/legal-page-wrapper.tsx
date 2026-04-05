import React from 'react';
import Link from 'next/link';
import { Logo } from '@/components/icons';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LegalPageWrapperProps {
    children: React.ReactNode;
}

/**
 * Wrapper for all legal pages (Terms, Privacy, Refund).
 * Provides consistent branding header and back navigation
 * so users are never stranded without site chrome.
 */
export function LegalPageWrapper({ children }: LegalPageWrapperProps) {
    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Minimal header matching landing navbar style */}
            <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <Link
                        href="/"
                        className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
                    >
                        <Logo className="h-8 w-8 text-primary" />
                        <span className="text-xl font-bold tracking-tight">Team4Job</span>
                    </Link>
                    <Button variant="ghost" size="sm" asChild className="gap-2 text-muted-foreground hover:text-foreground">
                        <Link href="/">
                            <ArrowLeft className="h-4 w-4" />
                            Back to Home
                        </Link>
                    </Button>
                </div>
            </header>

            {/* Page content */}
            <main className="flex-1">
                {children}
            </main>

            {/* Minimal footer */}
            <footer className="border-t py-6">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
                    <p>&copy; {new Date().getFullYear()} Team4Job. All Rights Reserved.</p>
                    <div className="flex gap-6">
                        <Link href="/terms-of-service" className="hover:text-primary transition-colors">Terms</Link>
                        <Link href="/privacy-policy" className="hover:text-primary transition-colors">Privacy</Link>
                        <Link href="/refund-policy" className="hover:text-primary transition-colors">Refund Policy</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
