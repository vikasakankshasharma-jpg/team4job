"use client";

import React from "react";
import { Job } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/job-giver/status-badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, ExternalLink, Archive, Trash2 } from "lucide-react";
import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import { toDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface MobileJobCardProps {
    job: Job;
    onArchive?: (jobId: string) => void;
    onDelete?: (jobId: string) => void;
    className?: string;
}

export function MobileJobCard({
    job,
    onArchive,
    onDelete,
    className
}: MobileJobCardProps) {
    const bidCount = (job.bids || []).length;
    const postedDate = toDate(job.postedAt);

    // Swipe State
    const [translateX, setTranslateX] = React.useState(0);
    const [isDragging, setIsDragging] = React.useState(false);
    const startX = React.useRef(0);
    const startY = React.useRef(0); // Check for vertical scroll

    // Swipe Constants
    const ACTION_WIDTH = 140; // Width of revealed actions
    const THRESHOLD = 50;

    const onTouchStart = (e: React.TouchEvent) => {
        startX.current = e.touches[0].clientX;
        startY.current = e.touches[0].clientY;
        setIsDragging(true);
    };

    const onTouchMove = (e: React.TouchEvent) => {
        if (!isDragging) return;
        const currentX = e.touches[0].clientX;
        const currentY = e.touches[0].clientY;
        const diffX = currentX - startX.current;
        const diffY = currentY - startY.current;

        // If scrolling vertically, ignore horizontal swipe
        if (Math.abs(diffY) > Math.abs(diffX)) return;

        // Only allow swipe left (negative diffX)
        if (diffX < 0) {
            // Visualize resistance/limit
            const newTranslate = Math.max(diffX, -ACTION_WIDTH - 20);
            setTranslateX(newTranslate);
        } else if (translateX < 0) {
            // Allow closing if already open
            setTranslateX(Math.min(0, translateX + diffX));
        }
    };

    const onTouchEnd = () => {
        setIsDragging(false);
        // Snap logic
        if (translateX < -THRESHOLD) {
            setTranslateX(-ACTION_WIDTH); // Snap open
        } else {
            setTranslateX(0); // Snap close
        }
    };

    return (
        <div className={cn("relative overflow-hidden rounded-lg", className)}>
            {/* Background Actions Layer */}
            <div className="absolute inset-y-0 right-0 flex w-[140px]">
                {onArchive && (
                    <Button
                        variant="ghost"
                        className="h-full flex-1 rounded-none bg-orange-100 text-orange-700 hover:bg-orange-200 hover:text-orange-800"
                        onClick={() => {
                            onArchive(job.id!);
                            setTranslateX(0);
                        }}
                    >
                        <div className="flex flex-col items-center gap-1">
                            <Archive className="h-5 w-5" />
                            <span className="text-[10px] font-medium">Archive</span>
                        </div>
                    </Button>
                )}
                {onDelete && (
                    <Button
                        variant="ghost"
                        className="h-full flex-1 rounded-none bg-red-100 text-red-700 hover:bg-red-200 hover:text-red-800"
                        onClick={() => {
                            onDelete(job.id!);
                            setTranslateX(0);
                        }}
                    >
                        <div className="flex flex-col items-center gap-1">
                            <Trash2 className="h-5 w-5" />
                            <span className="text-[10px] font-medium">Delete</span>
                        </div>
                    </Button>
                )}
            </div>

            {/* Foreground Card Layer */}
            <Card
                className={cn("relative z-10 transition-transform duration-200 ease-out bg-background")}
                style={{ transform: `translateX(${translateX}px)` }}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
            >
                <CardContent className="p-4">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1 min-w-0">
                            <Link
                                href={`/dashboard/jobs/${job.id}`}
                                className="block"
                            >
                                <h4 className="font-semibold text-base line-clamp-2 hover:underline">
                                    {job.title}
                                </h4>
                            </Link>
                            <p className="text-xs text-muted-foreground mt-1">
                                {formatDistanceToNow(postedDate, { addSuffix: true })}
                            </p>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                            <StatusBadge status={job.status} showTooltip={false} size="sm" />
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-11 w-11"
                                    >
                                        <MoreVertical className="h-5 w-5" />
                                        <span className="sr-only">Actions</span>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem asChild>
                                        <Link href={`/dashboard/jobs/${job.id}`} className="min-h-[44px] flex items-center">
                                            <ExternalLink className="mr-2 h-4 w-4" />
                                            View Details
                                        </Link>
                                    </DropdownMenuItem>
                                    {onArchive && (
                                        <DropdownMenuItem onClick={() => onArchive(job.id!)} className="min-h-[44px] flex items-center">
                                            <Archive className="mr-2 h-4 w-4" />
                                            Archive
                                        </DropdownMenuItem>
                                    )}
                                    {onDelete && (
                                        <DropdownMenuItem
                                            onClick={() => onDelete(job.id!)}
                                            className="text-destructive min-h-[44px] flex items-center"
                                        >
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Delete
                                        </DropdownMenuItem>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-3 gap-3 py-3 border-t">
                        <div className="text-center">
                            <p className="text-xs text-muted-foreground">Bids</p>
                            <p className="text-lg font-semibold mt-1">
                                {bidCount}
                            </p>
                        </div>

                        <div className="text-center border-x">
                            <p className="text-xs text-muted-foreground">Budget</p>
                            <p className="text-lg font-semibold mt-1">
                                {job.priceEstimate
                                    ? `₹${Math.round((job.priceEstimate.min + job.priceEstimate.max) / 2).toLocaleString()}`
                                    : 'N/A'}
                            </p>
                        </div>

                        <div className="text-center">
                            <p className="text-xs text-muted-foreground">Category</p>
                            <p className="text-sm font-medium mt-1 truncate">
                                {job.jobCategory || 'General'}
                            </p>
                        </div>
                    </div>

                    {/* Action Button */}
                    <Button
                        className="w-full mt-3 min-h-[44px]"
                        size="sm"
                        asChild
                    >
                        <Link href={`/dashboard/jobs/${job.id}`}>
                            View Job
                        </Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
