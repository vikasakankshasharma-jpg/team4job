"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EnhancedEmptyStateProps {
    icon: LucideIcon;
    title: string;
    description: string;
    action?: {
        label: string;
        onClick: () => void;
        variant?: 'default' | 'outline' | 'secondary';
    };
    secondaryAction?: {
        label: string;
        onClick: () => void;
    };
    className?: string;
}

export function EnhancedEmptyState({
    icon: Icon,
    title,
    description,
    action,
    secondaryAction,
    className
}: EnhancedEmptyStateProps) {
    return (
        <div className={cn(
            "flex flex-col items-center justify-center text-center p-12 rounded-lg border-2 border-dashed",
            "bg-gradient-to-b from-muted/50 to-muted/20 min-h-[400px]",
            className
        )}>
            {/* Animated icon with glow */}
            <div className="relative mb-6">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse" />
                <div className="relative bg-muted rounded-full p-6 shadow-lg">
                    <Icon className="h-12 w-12 text-muted-foreground" />
                </div>
            </div>

            {/* Content */}
            <h3 className="text-xl font-semibold mb-2 text-foreground">{title}</h3>
            <p className="text-muted-foreground max-w-md mb-6 text-sm leading-relaxed">
                {description}
            </p>

            {/* Actions */}
            {(action || secondaryAction) && (
                <div className="flex flex-col sm:flex-row items-center gap-3">
                    {action && (
                        <Button
                            onClick={action.onClick}
                            variant={action.variant || 'default'}
                            size="lg"
                            className="shadow-lg hover:shadow-xl transition-all"
                        >
                            {action.label}
                        </Button>
                    )}
                    {secondaryAction && (
                        <Button
                            onClick={secondaryAction.onClick}
                            variant="ghost"
                            size="lg"
                        >
                            {secondaryAction.label}
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
}
