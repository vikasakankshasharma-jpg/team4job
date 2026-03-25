"use client";

import { Milestone, Job, User } from '@/lib/types';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock } from "lucide-react";
import { motion } from "framer-motion";

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

    if (milestones.length === 0) return null;

    return (
        <div className="space-y-6">
            <h3 className="text-xl font-black uppercase tracking-tighter italic px-2">Project Milestones</h3>
            <div className="grid gap-4">
                {milestones.map((milestone, index) => (
                    <motion.div
                        key={milestone.id}
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        transition={{ delay: index * 0.1 }}
                        className="group relative overflow-hidden rounded-[2.5rem] bg-white/40 backdrop-blur-xl border border-white/40 p-8 shadow-2xl hover:shadow-primary/10 transition-all"
                    >
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                            <div className="space-y-2">
                                <div className="flex items-center gap-3">
                                    <h4 className="text-xl font-black tracking-tighter italic">{milestone.title}</h4>
                                    <Badge 
                                        variant={milestone.status === 'released' ? 'default' : 'secondary'}
                                        className="rounded-full px-4 py-1 font-black uppercase text-[10px]"
                                    >
                                        {milestone.status}
                                    </Badge>
                                </div>
                                <p className="text-sm font-medium opacity-60 leading-relaxed max-w-xl">{milestone.description}</p>
                                <div className="pt-2">
                                    <span className="text-2xl font-black tracking-tighter italic text-primary">
                                        ₹{milestone.amount.toLocaleString()}
                                    </span>
                                </div>
                            </div>

                            <div className="w-full sm:w-auto">
                                {isClient && milestone.status === 'funded' && (
                                    <Button 
                                        onClick={() => onRelease(milestone.id)} 
                                        className="w-full sm:w-auto rounded-full px-8 py-6 font-black uppercase tracking-widest text-xs hover:scale-105 transition-transform"
                                    >
                                        <CheckCircle className="h-4 w-4 mr-2" />
                                        Release Payment
                                    </Button>
                                )}

                                {milestone.status === 'released' && (
                                    <div className="flex items-center gap-2 bg-success/10 text-success px-6 py-3 rounded-full font-black uppercase tracking-widest text-[10px]">
                                        <CheckCircle className="h-4 w-4" />
                                        Payment Released
                                    </div>
                                )}
                                {milestone.status === 'pending' && (
                                    <div className="flex items-center gap-2 bg-muted/40 px-6 py-3 rounded-full font-black uppercase tracking-widest text-[10px] opacity-40">
                                        <Clock className="h-4 w-4" />
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
