"use client";

import React from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, MapPin, Users, TrendingUp, Star, Calendar } from 'lucide-react';
import { Job } from '@/lib/types';
import { cn, toDate } from '@/lib/utils';
import Link from 'next/link';
import { StatusBadge } from './status-badge';
import { format, formatDistanceToNow } from 'date-fns';

interface PremiumJobCardProps {
    job: Job;
    showBidCount?: boolean;
    showLocation?: boolean;
    compact?: boolean;
    className?: string;
}

export function PremiumJobCard({
    job,
    showBidCount = true,
    showLocation = true,
    compact = false,
    className
}: PremiumJobCardProps) {
    const bidCount = job.bids?.length || 0;
    const hasNewBids = bidCount > 0 && job.status === 'Open for Bidding';
    const isDirectAward = !!job.directAwardInstallerId;

    return (
        <Card className={cn(
            "group relative overflow-hidden transition-all duration-300",
            "hover:shadow-xl hover:-translate-y-1 hover:border-primary/50",
            "border-2",
            className
        )}>
            {/* Status indicator bar */}
            <div className={cn(
                "absolute top-0 left-0 right-0 h-1 transition-all",
                job.status === 'Open for Bidding' && "bg-blue-500",
                job.status === 'Awarded' && "bg-amber-500",
                job.status === 'In Progress' && "bg-purple-500",
                job.status === 'Completed' && "bg-green-500",
                job.status === 'Cancelled' && "bg-red-500",
                job.status === 'Pending Funding' && "bg-orange-500",
            )} />

            <CardHeader className={cn("pb-3", compact && "pb-2")}>
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                        <Link href={`/dashboard/jobs/${job.id}`} className="block">
                            <h3 className={cn(
                                "font-semibold text-lg mb-1.5 hover:text-primary transition-colors line-clamp-2",
                                compact ? "text-base" : "text-lg"
                            )}>
                                {job.title}
                            </h3>
                        </Link>
                        <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-xs font-mono text-muted-foreground">
                                {job.id.slice(-8)}
                            </p>
                            <span className="text-muted-foreground">•</span>
                            <p className="text-xs text-muted-foreground">
                                {formatDistanceToNow(toDate(job.postedAt), { addSuffix: true })}
                            </p>
                        </div>
                    </div>

                    <div className="shrink-0">
                        <StatusBadge status={job.status} showTooltip={!compact} size={compact ? 'sm' : 'md'} />
                    </div>
                </div>
            </CardHeader>

            <CardContent className={cn("space-y-3", compact ? "pb-3" : "pb-4")}>
                {/* Budget highlight */}
                {job.priceEstimate && (
                    <div className="flex items-center justify-between p-3 bg-gradient-to-r from-muted/80 to-muted/40 rounded-lg border border-border/50">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-green-500/10 rounded">
                                <TrendingUp className="h-4 w-4 text-green-600" />
                            </div>
                            <span className="text-sm font-medium text-muted-foreground">Budget</span>
                        </div>
                        <div className="text-right">
                            <div className="font-bold text-base">
                                ₹{job.priceEstimate.min.toLocaleString()}
                                {job.priceEstimate.max > job.priceEstimate.min && (
                                    <> - ₹{job.priceEstimate.max.toLocaleString()}</>
                                )}
                            </div>
                            {job.travelTip && job.travelTip > 0 && (
                                <div className="text-xs text-green-600 font-medium">
                                    + ₹{job.travelTip.toLocaleString()} tip
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Info grid */}
                <div className="grid grid-cols-2 gap-2 text-sm">
                    {showBidCount && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Users className="h-4 w-4 shrink-0" />
                            <span className="truncate">
                                {bidCount} {bidCount === 1 ? 'bid' : 'bids'}
                            </span>
                            {hasNewBids && (
                                <Badge variant="secondary" className="ml-auto text-xs px-1.5 py-0">
                                    New
                                </Badge>
                            )}
                        </div>
                    )}

                    {showLocation && (
                        <div className="flex items-center gap-2 text-muted-foreground truncate">
                            <MapPin className="h-4 w-4 shrink-0" />
                            <span className="truncate">{job.location}</span>
                        </div>
                    )}

                    {job.jobStartDate && (
                        <div className="flex items-center gap-2 text-muted-foreground col-span-2">
                            <Calendar className="h-4 w-4 shrink-0" />
                            <span className="text-xs">
                                Start: {format(toDate(job.jobStartDate), 'MMM d, yyyy')}
                            </span>
                        </div>
                    )}
                </div>
            </CardContent>

            <CardFooter className={cn(
                "pt-3 border-t flex items-center justify-between",
                compact && "pt-2"
            )}>
                <Button
                    asChild
                    variant="outline"
                    size={compact ? "sm" : "default"}
                    className="group-hover:bg-primary/10 group-hover:border-primary/50 transition-all"
                >
                    <Link href={`/dashboard/jobs/${job.id}`}>
                        View Details →
                    </Link>
                </Button>

                {/* Context badges */}
                <div className="flex items-center gap-2">
                    {isDirectAward && (
                        <Badge variant="secondary" className="text-xs bg-amber-500/10 text-amber-700 border-amber-500/20">
                            <Star className="h-3 w-3 mr-1 fill-current" />
                            Direct
                        </Badge>
                    )}
                    {hasNewBids && (
                        <Badge variant="default" className="text-xs bg-blue-500 hover:bg-blue-600">
                            {bidCount} waiting
                        </Badge>
                    )}
                </div>
            </CardFooter>

            {/* Urgent indicator */}
            {job.isUrgent && (
                <div className="absolute top-12 -right-10 rotate-45 bg-red-500 text-white text-xs font-bold px-12 py-1 shadow-lg">
                    URGENT
                </div>
            )}
        </Card>
    );
}
