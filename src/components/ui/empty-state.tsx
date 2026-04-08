"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
    icon: LucideIcon;
    title: string;
    description?: string;
    className?: string;
}

export function EmptyState({ icon: Icon, title, description, className }: EmptyStateProps) {
    return (
        <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
                "flex flex-col items-center justify-center p-12 text-center bg-surface-container-low/40 backdrop-blur-3xl rounded-[3.5rem] border border-dashed border-white/5 shadow-inner",
                className
            )}
        >
            <div className="p-6 rounded-full bg-primary/5 mb-8 shadow-2xl shadow-primary/10 border border-white/5 group overflow-hidden relative">
                <div className="absolute inset-0 bg-primary/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                <Icon className="h-10 w-10 text-primary opacity-40 relative z-10" />
            </div>
            <h3 className="text-3xl font-black italic tracking-tighter uppercase mb-4 leading-none">
                {title}
            </h3>
            {description && (
                <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-muted-foreground/40 italic leading-relaxed max-w-[40ch]">
                    {description}
                </p>
            )}
        </motion.div>
    );
}

export function InlineEmptyState({ icon: Icon, title, className }: { icon: LucideIcon; title: string; className?: string }) {
    return (
        <div className={cn("flex flex-col items-center justify-center py-10 px-6 text-center space-y-4", className)}>
            <div className="p-3 rounded-[1rem] bg-muted/10 border border-white/5 shadow-inner">
                <Icon className="h-5 w-5 text-muted-foreground/30" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/30 italic max-w-[25ch]">
                {title}
            </p>
        </div>
    );
}
