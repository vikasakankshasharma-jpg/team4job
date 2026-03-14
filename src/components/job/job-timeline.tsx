import React from 'react';
import { CheckCircle2, Circle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { JobStatus } from '@/domains/jobs/job.types';

interface JobTimelineProps {
    status: JobStatus | string;
    className?: string;
    userRole: 'Job Giver' | 'Installer' | 'Admin' | 'Support Team';
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
        <div className={cn("w-full py-4", className)}>
            {isCancelled ? (
                <div className="flex items-center justify-center p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 font-medium dark:bg-red-950/30 dark:border-red-800 dark:text-red-400">
                    ❌ This job has been cancelled.
                </div>
            ) : (
                <div className="flex items-center justify-between w-full px-1 sm:px-2">
                    {STEPS.map((step, index) => {
                        const isCompleted = index < currentStepIndex;
                        const isCurrent = index === currentStepIndex;
                        const isFuture = index > currentStepIndex;

                        return (
                            <React.Fragment key={step.id}>
                                {/* Step Node */}
                                <div className="flex flex-col items-center gap-1 sm:gap-2 relative z-10">
                                    <div className={cn(
                                        "w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 shrink-0",
                                        isCompleted ? "bg-green-600 border-green-600 text-white" : "",
                                        isCurrent ? "bg-primary border-primary text-primary-foreground ring-2 sm:ring-4 ring-primary/20 scale-105 sm:scale-110" : "",
                                        isFuture ? "bg-muted border-muted-foreground/30 text-muted-foreground" : ""
                                    )}>
                                        {isCompleted ? (
                                            <CheckCircle2 className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                                        ) : isCurrent ? (
                                            <Clock className="w-3.5 h-3.5 sm:w-5 sm:h-5 animate-pulse" />
                                        ) : (
                                            <Circle className="w-3 h-3 sm:w-4 sm:h-4" />
                                        )}
                                    </div>
                                    <span className={cn(
                                        "text-[10px] sm:text-xs font-medium text-center transition-colors leading-tight",
                                        isCurrent ? "text-primary font-bold" : "text-muted-foreground"
                                    )}>
                                        {step.label}
                                    </span>
                                </div>

                                {/* Connector */}
                                {index < STEPS.length - 1 && (
                                    <div className="flex-1 h-[2px] mx-0.5 sm:mx-1.5 relative -top-2 sm:-top-3 shrink-0">
                                        <div className={cn(
                                            "absolute inset-0 h-full transition-all duration-500 rounded-full",
                                            index < currentStepIndex ? "bg-green-600" : "bg-muted-foreground/20"
                                        )} />
                                    </div>
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
