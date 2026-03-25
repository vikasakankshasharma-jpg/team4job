import React from 'react';
import { CheckCircle2, Circle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { JobStatus } from '@/domains/jobs/job.types';
import { motion } from 'framer-motion';

interface JobTimelineProps {
    status: JobStatus | string;
    className?: string;
    userRole: 'Client' | 'Professional' | 'Admin' | 'Support Team';
}

const STEPS = [
    { id: 'open', label: 'Bidding', statusMatch: ['open', 'unbid'] },
    { id: 'bid_accepted', label: 'Accepted', statusMatch: ['bid_accepted', 'awarded'] },
    { id: 'funded', label: 'Funded', statusMatch: ['funded'] },
    { id: 'in_progress', label: 'In Progress', statusMatch: ['in_progress'] },
    { id: 'work_submitted', label: 'Review', statusMatch: ['work_submitted'] },
    { id: 'completed', label: 'Done', statusMatch: ['completed'] },
];

export function JobTimeline({ status, className, userRole }: JobTimelineProps) {
    const normalizedStatus = status.toLowerCase();

    let currentStepIndex = STEPS.findIndex(step => step.statusMatch.includes(normalizedStatus));
    if (normalizedStatus === 'draft') currentStepIndex = -1;
    if (normalizedStatus === 'cancelled') currentStepIndex = -1;
    if (normalizedStatus === 'disputed') currentStepIndex = 3;

    const isCancelled = normalizedStatus === 'cancelled';

    return (
        <div className={cn("w-full py-2", className)}>
            {isCancelled ? (
                <div className="flex items-center justify-center p-6 bg-destructive/10 border border-destructive/20 rounded-[1.5rem] text-destructive font-black text-xs uppercase tracking-widest italic animate-pulse">
                    ❌ This job has been cancelled.
                </div>
            ) : (
                <div className="flex items-center justify-between w-full px-2 relative">
                    {/* Background Progress Line */}
                    <div className="absolute top-[18px] sm:top-[22px] left-8 right-8 h-[3px] bg-foreground/5 rounded-full z-0" />
                    
                    {STEPS.map((step, index) => {
                        const isCompleted = index < currentStepIndex;
                        const isCurrent = index === currentStepIndex;
                        const isFuture = index > currentStepIndex;

                        return (
                            <div key={step.id} className="flex flex-col items-center gap-3 relative z-10 group">
                                {/* Step Node */}
                                <motion.div 
                                    initial={false}
                                    animate={{ 
                                        scale: isCurrent ? 1.2 : 1,
                                        backgroundColor: isCompleted ? "var(--success)" : isCurrent ? "var(--primary)" : "transparent"
                                    }}
                                    className={cn(
                                        "w-9 h-9 sm:w-11 sm:h-11 rounded-full flex items-center justify-center border-2 transition-all duration-500 shrink-0 shadow-lg",
                                        isCompleted ? "border-success text-white shadow-success/20" : "",
                                        isCurrent ? "border-primary text-primary-foreground shadow-primary/30 ring-4 ring-primary/20" : "",
                                        isFuture ? "bg-card border-foreground/10 text-muted-foreground/40 group-hover:border-foreground/20" : ""
                                    )}
                                >
                                    {isCompleted ? (
                                        <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />
                                    ) : isCurrent ? (
                                        <Clock className="w-5 h-5 sm:w-6 sm:h-6 animate-spin-slow" />
                                    ) : (
                                        <div className="w-2 h-2 rounded-full bg-foreground/20 group-hover:bg-foreground/40 transition-colors" />
                                    )}
                                </motion.div>

                                {/* Label */}
                                <div className="flex flex-col items-center">
                                    <span className={cn(
                                        "text-[10px] font-black uppercase tracking-widest transition-all duration-300",
                                        isCurrent ? "text-primary scale-110" : "text-muted-foreground/40"
                                    )}>
                                        {step.label}
                                    </span>
                                    {isCurrent && (
                                        <motion.div 
                                            layoutId="active-indicator"
                                            className="h-1 w-4 bg-primary rounded-full mt-1"
                                        />
                                    )}
                                </div>

                                {/* Dynamic Connector (Active overlay) */}
                                {index < STEPS.length - 1 && index < currentStepIndex && (
                                    <motion.div 
                                        initial={{ scaleX: 0 }}
                                        animate={{ scaleX: 1 }}
                                        className="absolute top-[18px] sm:top-[22px] left-[calc(50%+20px)] w-[calc(100%-40px)] h-[3px] bg-success origin-left z-0"
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
