"use client";

import React from 'react';
import { Badge } from '@/components/ui/badge';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';

const statusConfig = {
    'Open for Bidding': {
        description: 'Installers can submit bids until the deadline',
        nextStep: 'Review bids after deadline',
        color: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30',
        emoji: '🔵',
    },
    'Bidding Closed': {
        description: 'Bidding deadline has passed',
        nextStep: 'Review bids and award job',
        color: 'bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/30',
        emoji: '⏸️',
    },
    'Awarded': {
        description: 'Job awarded to installer, awaiting acceptance',
        nextStep: 'Installer must accept within deadline',
        color: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30',
        emoji: '🟡',
    },
    'In Progress': {
        description: 'Work is actively ongoing',
        nextStep: 'Monitor progress and communicate',
        color: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30',
        emoji: '🟣',
    },
    'Pending Funding': {
        description: 'Installer accepted, payment required',
        nextStep: 'Fund the project within 48 hours',
        color: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30',
        emoji: '⏳',
    },
    'Pending Confirmation': {
        description: 'Installer submitted work for review',
        nextStep: 'Review and approve payment release',
        color: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/30',
        emoji: '👀',
    },
    'Completed': {
        description: 'Job successfully completed',
        nextStep: 'Leave a review for the installer',
        color: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30',
        emoji: '✅',
    },
    'Cancelled': {
        description: 'Job was cancelled',
        nextStep: 'Refund processed if applicable',
        color: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30',
        emoji: '❌',
    },
    'Unbid': {
        description: 'No bids received by deadline',
        nextStep: 'Repost or promote the job',
        color: 'bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/30',
        emoji: '⭕',
    },
    'Disputed': {
        description: 'Dispute raised, under admin review',
        nextStep: 'Wait for admin resolution',
        color: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30',
        emoji: '⚠️',
    },
    'Needs Assistance': {
        description: 'Requires support team intervention',
        nextStep: 'Support team will contact you',
        color: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/30',
        emoji: '🆘',
    },
    'Cancellation Proposed': {
        description: 'Cancellation requested, awaiting response',
        nextStep: 'Review cancellation request',
        color: 'bg-pink-500/10 text-pink-700 dark:text-pink-400 border-pink-500/30',
        emoji: '⏹️',
    },
    // Lowercase fallback mapping
    'open': {
        description: 'Installers can submit bids until the deadline',
        nextStep: 'Review bids after deadline',
        color: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30',
        emoji: '🔵',
    },
    'bidding closed': {
        description: 'Bidding deadline has passed',
        nextStep: 'Review bids and award job',
        color: 'bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/30',
        emoji: '⏸️',
    },
    'bid_accepted': {
        description: 'Job awarded to installer, awaiting acceptance',
        nextStep: 'Installer must accept within deadline',
        color: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30',
        emoji: '🟡',
    },
    'awarded': {
        description: 'Job awarded to installer, awaiting acceptance',
        nextStep: 'Installer must accept within deadline',
        color: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30',
        emoji: '🟡',
    },
    'in_progress': {
        description: 'Work is actively ongoing',
        nextStep: 'Monitor progress and communicate',
        color: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30',
        emoji: '🟣',
    },
    'funded': {
        description: 'Installer accepted, payment required',
        nextStep: 'Wait for work to start',
        color: 'bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/30',
        emoji: '💰',
    },
    'work_submitted': {
        description: 'Installer submitted work for review',
        nextStep: 'Review and approve payment release',
        color: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/30',
        emoji: '👀',
    },
    'completed': {
        description: 'Job successfully completed',
        nextStep: 'Leave a review for the installer',
        color: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30',
        emoji: '✅',
    },
    'cancelled': {
        description: 'Job was cancelled',
        nextStep: 'Refund processed if applicable',
        color: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30',
        emoji: '❌',
    },
    'unbid': {
        description: 'No bids received by deadline',
        nextStep: 'Repost or promote the job',
        color: 'bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/30',
        emoji: '⭕',
    },
    'disputed': {
        description: 'Dispute raised, under admin review',
        nextStep: 'Wait for admin resolution',
        color: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30',
        emoji: '⚠️',
    },
};

interface StatusBadgeProps {
    status: string;
    showTooltip?: boolean;
    showEmoji?: boolean;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

export function StatusBadge({
    status,
    showTooltip = true,
    showEmoji = true,
    size = 'md',
    className
}: StatusBadgeProps) {
    const config = statusConfig[status as keyof typeof statusConfig];

    if (!config) {
        return (
            <Badge variant="outline" className={className}>
                {status}
            </Badge>
        );
    }

    const badge = (
        <Badge
            variant="outline"
            className={cn(
                "border-2 font-medium transition-all hover:scale-105",
                config.color,
                size === 'sm' && "text-xs px-2 py-0.5",
                size === 'lg' && "text-sm px-4 py-1.5",
                className
            )}
        >
            {showEmoji && <span className="mr-1.5">{config.emoji}</span>}
            {status}
        </Badge>
    );

    if (!showTooltip) return badge;

    return (
        <TooltipProvider>
            <Tooltip delayDuration={300}>
                <TooltipTrigger asChild>
                    <div className="inline-flex items-center gap-1.5 cursor-help">
                        {badge}
                        <Info className="h-3.5 w-3.5 text-muted-foreground opacity-60 hover:opacity-100 transition-opacity" />
                    </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs" side="bottom">
                    <div className="space-y-2">
                        <p className="font-medium text-sm">{config.description}</p>
                        <p className="text-xs text-muted-foreground">
                            <strong className="text-foreground">Next Step:</strong> {config.nextStep}
                        </p>
                    </div>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
