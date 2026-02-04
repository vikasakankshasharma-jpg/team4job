import React from 'react';
import { CheckCircle2, Circle, Clock, ArrowRight } from 'lucide-react';
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
    // Normalize status
    const normalizedStatus = status.toLowerCase();

    // Determine current step index
    let currentStepIndex = STEPS.findIndex(step => step.statusMatch.includes(normalizedStatus));

    // Handle edge cases
    if (normalizedStatus === 'draft') currentStepIndex = -1;
    if (normalizedStatus === 'cancelled') currentStepIndex = -1; // Special case for cancelled?

    // If status not found (e.g. disputed), map to nearest logical step or show alert
    if (normalizedStatus === 'disputed') currentStepIndex = 3; // Usually happens during progress/review

    const isCancelled = normalizedStatus === 'cancelled';

    return (
        <div className={cn("w-full py-4 overflow-x-auto", className)}>
            {isCancelled ? (
                <div className="flex items-center justify-center p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 font-medium">
                    ❌ This job has been cancelled.
                </div>
            ) : (
                <div className="flex items-center justify-between min-w-[600px] px-2">
                    {STEPS.map((step, index) => {
                        const isCompleted = index < currentStepIndex;
                        const isCurrent = index === currentStepIndex;
                        const isFuture = index > currentStepIndex;

                        return (
                            <React.Fragment key={step.id}>
                                {/* Step Node */}
                                <div className="flex flex-col items-center gap-2 relative z-10 group">
                                    <div className={cn(
                                        "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300",
                                        isCompleted ? "bg-green-600 border-green-600 text-white" : "",
                                        isCurrent ? "bg-primary border-primary text-primary-foreground ring-4 ring-primary/20 scale-110" : "",
                                        isFuture ? "bg-muted border-muted-foreground/30 text-muted-foreground" : ""
                                    )}>
                                        {isCompleted ? (
                                            <CheckCircle2 className="w-5 h-5" />
                                        ) : isCurrent ? (
                                            <Clock className="w-5 h-5 animate-pulse" />
                                        ) : (
                                            <Circle className="w-4 h-4" />
                                        )}
                                    </div>
                                    <span className={cn(
                                        "text-xs font-medium absolute -bottom-6 w-24 text-center transition-colors",
                                        isCurrent ? "text-primary font-bold" : "text-muted-foreground"
                                    )}>
                                        {step.label}
                                    </span>
                                </div>

                                {/* Connector Line */}
                                {index < STEPS.length - 1 && (
                                    <div className="flex-1 h-[2px] mx-2 relative top-[-10px]">
                                        <div className={cn(
                                            "absolute inset-0 h-full transition-all duration-500",
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
