"use client";

import { Milestone, Job, User } from '@/lib/types';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from '@/lib/utils';

interface MilestoneListProps {
    job: Job;
    user: User | null;
    isClient: boolean;
    onRelease: (milestoneId: string) => Promise<void>;
}

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
};

export function MilestoneList({ job, user, isClient, onRelease }: MilestoneListProps) {
    const milestones = job.milestones || [];

    return (
        <div className="space-y-10">
            <div className="flex items-center gap-4">
                <h3 className="text-xl font-black uppercase tracking-[0.3em] italic text-muted-foreground/60">Payment Milestones</h3>
                <div className="h-1 flex-1 bg-gradient-to-r from-primary/10 to-transparent rounded-full" />
            </div>

            <div className="grid gap-8">
                {milestones.map((milestone, index) => (
                    <motion.div
                        key={milestone.id}
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        transition={{ delay: index * 0.1 }}
                        className="group relative overflow-hidden rounded-[3rem] bg-surface-container-low/40 backdrop-blur-3xl border border-white/5 p-10 shadow-2xl transition-all hover:translate-x-1"
                        data-testid="milestone-item"
                    >
                        {/* Status Accent Bar Container */}
                        <div className={cn(
                            "absolute top-0 left-0 w-2 h-full transition-all duration-500",
                            milestone.status === 'released' ? "bg-success" : 
                            milestone.status === 'funded' ? "bg-primary" :
                            "bg-primary/20 group-hover:bg-primary"
                        )} />

                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-10 relative z-10">
                            <div className="space-y-4">
                                <div className="flex items-center gap-4">
                                    <h4 className="text-3xl font-black tracking-tighter italic uppercase underline decoration-primary/20 underline-offset-8">
                                        {milestone.title}
                                    </h4>
                                    <Badge 
                                        className={cn(
                                            "rounded-[1rem] px-6 py-2 font-black uppercase text-[10px] tracking-[0.2em] shadow-xl border-none",
                                            milestone.status === 'released' ? "bg-success text-white" : 
                                            milestone.status === 'funded' ? "bg-primary text-primary-foreground" :
                                            "bg-muted/40 text-muted-foreground"
                                        )}
                                        data-testid="milestone-status-badge"
                                    >
                                        {milestone.status}
                                    </Badge>
                                </div>
                                <p className="text-sm font-medium opacity-70 leading-relaxed max-w-xl italic">&quot;{milestone.description}&quot;</p>
                                <div className="pt-4">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black uppercase tracking-widest opacity-30 mb-1">Terminal Value</span>
                                        <span className="text-4xl font-black tracking-tighter italic text-primary">
                                            ₹{milestone.amount.toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="w-full sm:w-auto">
                                {isClient && milestone.status === 'funded' && (
                                    <Button 
                                        onClick={() => onRelease(milestone.id)} 
                                        className="w-full sm:w-auto rounded-[1.5rem] h-14 px-10 font-black uppercase tracking-[0.2em] text-[10px] bg-primary text-primary-foreground shadow-2xl shadow-primary/20 hover:scale-105 transition-all"
                                        data-testid="release-milestone-button"
                                    >
                                        <CheckCircle className="h-4 w-4 mr-2" />
                                        Release Payment
                                    </Button>
                                )}

                                {milestone.status === 'released' && (
                                    <div className="flex items-center gap-3 bg-success/10 text-success px-8 py-4 rounded-full font-black uppercase tracking-[0.2em] text-[10px] ring-1 ring-success/20">
                                        <CheckCircle className="h-5 w-5" />
                                        Payment Released
                                    </div>
                                )}
                                {milestone.status === 'pending' && (
                                    <div className="flex items-center gap-3 bg-muted/10 border border-white/5 px-8 py-4 rounded-full font-black uppercase tracking-[0.2em] text-[10px] opacity-40 italic">
                                        <Clock className="h-5 w-5" />
                                        Pending Funding
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
