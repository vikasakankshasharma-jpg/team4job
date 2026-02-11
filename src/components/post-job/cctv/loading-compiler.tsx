
"use client";

import { Loader2, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslations } from 'next-intl';

export function LoadingCompiler() {
    const tJob = useTranslations('job');

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="relative"
            >
                <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
                    <Sparkles className="h-12 w-12 text-primary animate-spin-slow" />
                </div>
                <div className="absolute -bottom-2 -right-2 bg-background rounded-full p-2 shadow-lg border">
                    <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
                </div>
            </motion.div>

            <h2 className="mt-8 text-2xl font-bold">
                {tJob('analyzingRequirements')}
            </h2>
            <p className="mt-2 text-lg text-muted-foreground max-w-md">
                {tJob('clearingRequirements')}
            </p>

            <div className="mt-8 space-y-2 text-sm text-muted-foreground/60">
                <p className="flex items-center justify-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    {tJob('structuringDetails')}
                </p>
                <p className="flex items-center justify-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    {tJob('checkingContradictions')}
                </p>
                <p className="flex items-center justify-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    {tJob('calculatingPrice')}
                </p>
            </div>
        </div>
    );
}
