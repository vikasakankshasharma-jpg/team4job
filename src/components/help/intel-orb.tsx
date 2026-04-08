"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, Sparkles } from 'lucide-react';
import { useHelpStore } from '@/store/help-store';
import { cn } from '@/lib/utils';

export function IntelOrb() {
    const { toggleSidebar, isSidebarOpen, activeTourId } = useHelpStore();

    if (activeTourId) return null; // Hide orb when a tour is active

    return (
        <div className="fixed bottom-28 sm:bottom-8 left-6 z-[100] pointer-events-auto">
            <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => toggleSidebar()}
                className={cn(
                    "relative h-14 w-14 rounded-full flex items-center justify-center transition-all duration-500 shadow-2xl overflow-hidden group",
                    isSidebarOpen 
                        ? "bg-foreground text-background shadow-[0_20px_50px_rgba(0,0,0,0.4)]" 
                        : "bg-surface-container-low/40 backdrop-blur-xl border border-white/5 text-primary shadow-[0_20px_50px_rgba(0,0,0,0.2)]"
                )}
            >
                {/* Background Pulse Glow */}
                {!isSidebarOpen && (
                    <div className="absolute inset-0 rounded-full animate-pulse-glow bg-primary/30 -z-10 shadow-[0_0_30px_rgba(var(--primary),0.2)]" />
                )}
                
                <AnimatePresence mode="wait">
                    {isSidebarOpen ? (
                        <motion.div
                            key="cross"
                            initial={{ rotate: -90, opacity: 0 }}
                            animate={{ rotate: 0, opacity: 1 }}
                            exit={{ rotate: 90, opacity: 0 }}
                        >
                            <HelpCircle className="h-6 w-6" />
                        </motion.div>
                    ) : (
                        <motion.div
                            key="sparkle"
                            initial={{ rotate: 90, opacity: 0 }}
                            animate={{ rotate: 0, opacity: 1 }}
                            exit={{ rotate: -90, opacity: 0 }}
                            className="relative"
                        >
                            <Sparkles className="h-6 w-6" />
                            <div className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-primary animate-ping" />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Internal rotation border */}
                {!isSidebarOpen && (
                    <div className="absolute inset-0 border border-primary/20 rounded-full group-hover:border-primary/50 transition-colors" />
                )}
            </motion.button>
            
            {/* Contextual Tagline */}
            <AnimatePresence>
                {!isSidebarOpen && (
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="absolute left-16 top-1/2 -translate-y-1/2 bg-surface-container-low/80 backdrop-blur-md px-4 py-2 rounded-full border border-white/5 shadow-xl pointer-events-none whitespace-nowrap"
                    >
                        <span className="text-[10px] font-black italic uppercase tracking-[0.2em] text-foreground/60">
                            Mission Intelligence available
                        </span>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// Add keyframes via CSS or inject them here if needed. 
// Assuming tailwind utilities or a global style for animate-pulse-glow.
