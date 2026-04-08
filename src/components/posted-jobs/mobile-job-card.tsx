"use client";

import React from "react";
import { Job } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/client/status-badge";
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
        <div className={cn("relative overflow-hidden rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)]", className)}>
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
                            <span className="text-[10px] font-black uppercase tracking-widest italic">Archive</span>
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
                            <span className="text-[10px] font-black uppercase tracking-widest italic">Delete</span>
                        </div>
                    </Button>
                )}
            </div>

            {/* Foreground Card Layer */}
            <Card
                className={cn("relative z-10 transition-transform duration-200 ease-out bg-background border-none rounded-[3rem] shadow-inner")}
                style={{ transform: `translateX(${translateX}px)` }}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
            >
                <CardContent className="p-5">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="flex-1 min-w-0">
                            <Link
                                href={`/dashboard/jobs/${job.id}`}
                                className="block"
                            >
                                <h4 className="font-black italic text-base line-clamp-2 uppercase tracking-tighter leading-tight hover:text-primary transition-colors">
                                    {job.title}
                                </h4>
                            </Link>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mt-2">
                                {formatDistanceToNow(postedDate, { addSuffix: true }).toUpperCase()}
                            </p>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                            <StatusBadge status={job.status} showTooltip={false} size="sm" />
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-10 w-10 rounded-[1rem] border border-white/5 bg-muted/30"
                                    >
                                        <MoreVertical className="h-4 w-4" />
                                        <span className="sr-only">Actions</span>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="rounded-[1.5rem] p-2 bg-surface-container-high/95 backdrop-blur-3xl border-white/10 shadow-2xl">
                                    <DropdownMenuItem asChild className="rounded-[1rem] mb-1">
                                        <Link href={`/dashboard/jobs/${job.id}`} className="min-h-[44px] flex items-center font-black italic tracking-tighter uppercase text-xs">
                                            <ExternalLink className="mr-3 h-4 w-4 text-primary" />
                                            View Mission
                                        </Link>
                                    </DropdownMenuItem>
                                    {onArchive && (
                                        <DropdownMenuItem onClick={() => onArchive(job.id!)} className="min-h-[44px] flex items-center rounded-[1rem] mb-1 font-black italic tracking-tighter uppercase text-xs">
                                            <Archive className="mr-3 h-4 w-4 text-orange-500" />
                                            Archive Data
                                        </DropdownMenuItem>
                                    )}
                                    {onDelete && (
                                        <DropdownMenuItem
                                            onClick={() => onDelete(job.id!)}
                                            className="text-destructive min-h-[44px] flex items-center rounded-[1rem] font-black italic tracking-tighter uppercase text-xs"
                                        >
                                            <Trash2 className="mr-3 h-4 w-4" />
                                            Purge Entry
                                        </DropdownMenuItem>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-3 gap-3 py-4 border-t border-white/5">
                        <div className="text-center">
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 mb-1">Bids</p>
                            <p className="text-xl font-black italic tracking-tighter uppercase text-on-surface">
                                {bidCount}
                            </p>
                        </div>

                        <div className="text-center border-x border-white/5">
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 mb-1">Budget</p>
                            <p className="text-xl font-black italic tracking-tighter uppercase text-on-surface">
                                {job.priceEstimate
                                    ? `₹${Math.round((job.priceEstimate.min + job.priceEstimate.max) / 2).toLocaleString()}`
                                    : '---'}
                            </p>
                        </div>

                        <div className="text-center">
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 mb-1">Class</p>
                            <p className="text-xs font-black italic tracking-tighter uppercase text-primary truncate">
                                {job.jobCategory || 'General'}
                            </p>
                        </div>
                    </div>

                    {/* Action Button */}
                    <Button
                        className="w-full mt-2 min-h-[56px] rounded-[1.5rem] font-black italic tracking-tighter uppercase text-sm shadow-2xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98] border-none"
                        size="sm"
                        asChild
                    >
                        <Link href={`/dashboard/jobs/${job.id}`}>
                            Open Mission File
                        </Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
