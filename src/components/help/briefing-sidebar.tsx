"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useHelpStore } from '@/store/help-store';
import { MISSION_TOURS, CONTEXTUAL_BRIEFS } from './mission-data';
import { usePathname } from 'next/navigation';
import { X, Play, BookOpen, Shield, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUser } from '@/hooks/use-user';
import { cn } from '@/lib/utils';

export function BriefingSidebar() {
    const { isSidebarOpen, toggleSidebar, startTour, completedTourIds } = useHelpStore();
    const pathname = usePathname();
    const { role } = useUser();

    const currentBrief = CONTEXTUAL_BRIEFS.find(b => b.routePattern.test(pathname));
    const availableTours = MISSION_TOURS.filter(t => t.role === role);

    return (
        <AnimatePresence>
            {isSidebarOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => toggleSidebar(false)}
                        className="fixed inset-0 bg-foreground/60 backdrop-blur-sm z-[140]"
                    />

                    {/* Sidebar */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                        className="fixed top-0 right-0 h-full w-full sm:w-[32rem] bg-surface-container-low/60 backdrop-blur-3xl z-[150] shadow-[-40px_0_80px_rgba(0,0,0,0.5)] border-l border-white/5 overflow-hidden flex flex-col rounded-l-[3.5rem]"
                    >
                        {/* Header */}
                        <div className="p-10 border-b border-white/5 bg-background/40 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-4 rounded-[1.5rem] bg-primary/10 text-primary shadow-2xl shadow-primary/5 ring-1 ring-white/5">
                                    <Shield className="h-6 w-6" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black italic tracking-tighter uppercase leading-none">Command Intelligence</h2>
                                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mt-1.5">Intel Hub // Mission Guidance</p>
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => toggleSidebar(false)} aria-label="Close Intelligence" className="rounded-full h-12 w-12 hover:bg-background/5 transition-all">
                                <X className="h-6 w-6" />
                            </Button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-10 space-y-12">
                            {/* Mission Brief Section */}
                            {currentBrief && (
                                <section className="space-y-6">
                                    <div className="flex items-center gap-3">
                                        <BookOpen className="h-4 w-4 text-primary/40" />
                                        <h3 className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground italic">{currentBrief.title}</h3>
                                    </div>
                                    <div className="space-y-4">
                                        {currentBrief.intelligence.map((intel, i) => (
                                            <div key={i} className="p-10 bg-background/40 rounded-[3rem] border border-white/5 shadow-inner flex gap-6 group hover:bg-background/60 transition-all ring-1 ring-white/5">
                                                <div className="h-3 w-3 rounded-full bg-primary mt-2 group-hover:scale-150 transition-transform shadow-[0_0_15px_rgba(var(--primary),0.6)]" />
                                                <p className="text-sm font-medium leading-relaxed opacity-90 italic">{intel}</p>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* Available Tours Section */}
                            <section className="space-y-6">
                                <div className="flex items-center gap-3">
                                    <Play className="h-4 w-4 text-primary/40" />
                                    <h3 className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground italic">Interactive Mission Tours</h3>
                                </div>
                                <div className="space-y-4">
                                    {availableTours.map((tour) => (
                                        <button
                                            key={tour.id}
                                            onClick={() => startTour(tour.id)}
                                            className="w-full text-left p-10 rounded-[3rem] bg-surface-container-high/40 border border-white/5 shadow-2xl hover:shadow-primary/10 hover:border-primary/30 hover:translate-x-1 transition-all group relative overflow-hidden ring-1 ring-white/5"
                                        >
                                            <div className="relative z-10 flex items-center justify-between">
                                                <div>
                                                    <h4 className="text-lg font-black italic tracking-tighter uppercase group-hover:text-primary transition-colors">{tour.title}</h4>
                                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mt-2 opacity-50 italic">{tour.description}</p>
                                                </div>
                                                <div className="h-14 w-14 flex items-center justify-center rounded-[1.5rem] bg-background/50 border border-white/5 shadow-inner group-hover:bg-primary group-hover:text-primary-foreground group-hover:scale-110 transition-all">
                                                    <ChevronRight className="h-6 w-6" />
                                                </div>
                                            </div>
                                            {completedTourIds.includes(tour.id) && (
                                                <div className="absolute top-2 right-12 bg-success/20 text-success text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border border-success/20">
                                                    Completed
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </section>
                        </div>

                        {/* Footer */}
                        <div className="p-10 border-t border-white/5 bg-background/40 text-center">
                            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/30">
                                Powered by Team4Job Intelligence // Phase 17 Pure
                            </p>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
