"use client";

import { Job, User, Bid, PlatformSettings } from "@/lib/types";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/job-giver/status-badge";
import { formatDistanceToNow } from "date-fns";
import { toDate } from "@/lib/utils";
import {
    MapPin,
    Calendar,
    IndianRupee,
    FileText,
    MessageSquare,
    Clock,
    DollarSign,
    Target,
    Briefcase
} from "lucide-react";
import { JobTimelineCard } from "@/components/job-timeline/job-timeline-card";
import Link from "next/link";

interface MobileJobDetailProps {
    job: Job;
    user: User | null;
    bids: Bid[];
    isJobGiver: boolean;
    platformSettings: PlatformSettings | null;
    onJobUpdate: () => void;
    // Add other necessary handlers as needed, keeping it simple for now
}

export function MobileJobDetail({
    job,
    user,
    bids,
    isJobGiver,
    platformSettings,
    onJobUpdate
}: MobileJobDetailProps) {
    const postedDate = toDate(job.postedAt);
    const deadline = job.deadline ? toDate(job.deadline) : null;
    const budgetMean = job.priceEstimate ? (job.priceEstimate.min + job.priceEstimate.max) / 2 : 0;

    return (
        <div className="pb-20"> {/* Padding for bottom action bar */}
            {/* 1. Compact Header */}
            <div className="bg-background pt-4 px-4 pb-2 border-b sticky top-0 z-10">
                <div className="flex items-start justify-between gap-3 mb-2">
                    <h1 className="text-xl font-bold leading-tight line-clamp-2">
                        {job.title}
                    </h1>
                    <div className="flex-shrink-0">
                        <StatusBadge status={job.status} size="sm" showTooltip={false} />
                    </div>
                </div>
                <div className="flex items-center text-xs text-muted-foreground gap-3 mb-2">
                    <span className="flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        {formatDistanceToNow(postedDate, { addSuffix: true })}
                    </span>
                    <span className="flex items-center">
                        <IndianRupee className="h-3 w-3 mr-1" />
                        {job.priceEstimate
                            ? `₹${Math.round(budgetMean).toLocaleString()}`
                            : 'Open Budget'}
                    </span>
                    <span className="flex items-center">
                        <DollarSign className="h-3 w-3 mr-1" />
                        {bids.length} Bids
                    </span>
                </div>
            </div>

            {/* 2. Accordion Sections */}
            <div className="p-4">
                <Accordion type="multiple" defaultValue={["overview", "timeline"]} className="space-y-4">

                    {/* Job Details */}
                    <Card>
                        <AccordionItem value="overview" className="border-none px-0">
                            <AccordionTrigger className="px-4 py-3 hover:no-underline font-semibold">
                                <div className="flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-primary" />
                                    Job Overview
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="px-4 pb-4">
                                <div className="space-y-4">
                                    <div className="text-sm text-foreground/90 whitespace-pre-wrap">
                                        {job.description}
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 pt-2">
                                        <div className="bg-muted/50 p-2.5 rounded-lg">
                                            <p className="text-xs text-muted-foreground mb-1 flex items-center">
                                                <Briefcase className="h-3 w-3 mr-1" /> Category
                                            </p>
                                            <p className="text-sm font-medium">{job.jobCategory || 'General'}</p>
                                        </div>
                                        <div className="bg-muted/50 p-2.5 rounded-lg">
                                            <p className="text-xs text-muted-foreground mb-1 flex items-center">
                                                <MapPin className="h-3 w-3 mr-1" /> Location
                                            </p>
                                            <p className="text-sm font-medium truncate">{job.location || 'Remote'}</p>
                                        </div>
                                    </div>

                                    {job.skills && job.skills.length > 0 && (
                                        <div>
                                            <p className="text-xs text-muted-foreground mb-2">Required Skills</p>
                                            <div className="flex flex-wrap gap-2">
                                                {job.skills.map(skill => (
                                                    <Badge key={skill} variant="secondary" className="text-xs font-normal">
                                                        {skill}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    </Card>

                    {/* Timeline & Communications */}
                    <Card>
                        <AccordionItem value="timeline" className="border-none px-0">
                            <AccordionTrigger className="px-4 py-3 hover:no-underline font-semibold">
                                <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-orange-500" />
                                    Timeline & Updates
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="px-1 pb-2">
                                {user ? (
                                    <JobTimelineCard
                                        job={job}
                                        currentUser={user}
                                    />
                                ) : (
                                    <p className="text-sm text-muted-foreground text-center py-4">
                                        Please log in to view timeline
                                    </p>
                                )}
                            </AccordionContent>
                        </AccordionItem>
                    </Card>

                    {/* Bids Section (Simplified) */}
                    {isJobGiver && (
                        <Card>
                            <AccordionItem value="bids" className="border-none px-0">
                                <AccordionTrigger className="px-4 py-3 hover:no-underline font-semibold">
                                    <div className="flex items-center justify-between w-full pr-4">
                                        <div className="flex items-center gap-2">
                                            <Target className="h-4 w-4 text-blue-600" />
                                            Received Bids
                                        </div>
                                        <Badge variant="outline" className="ml-2">{bids.length}</Badge>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="px-4 pb-4">
                                    {bids.length === 0 ? (
                                        <p className="text-sm text-muted-foreground text-center py-4">
                                            No bids received yet.
                                        </p>
                                    ) : (
                                        <div className="space-y-3">
                                            {bids.slice(0, 3).map((bid) => (
                                                <div key={bid.id} className="flex justify-between items-center p-3 border rounded-lg bg-card">
                                                    <div>
                                                        <p className="font-medium text-sm">{(bid.installer as any).name || 'Installer'}</p>
                                                        <p className="text-xs text-muted-foreground">{formatDistanceToNow(toDate(bid.timestamp))} ago</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-bold text-base">₹{bid.amount.toLocaleString()}</p>
                                                        <Button size="sm" variant="ghost" className="h-7 text-xs" asChild>
                                                            {/* Placeholder for now - would link to compare or detail */}
                                                            <span>View</span>
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                            {bids.length > 3 && (
                                                <Button variant="link" className="w-full text-xs">
                                                    View all {bids.length} bids
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                </AccordionContent>
                            </AccordionItem>
                        </Card>
                    )}
                </Accordion>
            </div>

            {/* 3. Sticky Bottom Action Bar */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t z-50 md:hidden pb-[safe-area-inset-bottom]">
                <div className="flex gap-3">
                    {/* Primary Action Button Logic */}
                    {job.status === 'Open for Bidding' && isJobGiver ? (
                        <Button className="w-full" size="lg">
                            Manage Bids ({bids.length})
                        </Button>
                    ) : job.status === 'Open for Bidding' && !isJobGiver ? (
                        <Button className="w-full" size="lg">
                            Place Bid
                        </Button>
                    ) : (
                        <Button className="w-full" size="lg" variant="outline" asChild>
                            <Link href={`/dashboard/messages?jobId=${job.id}`}>
                                <MessageSquare className="mr-2 h-4 w-4" /> Message
                            </Link>
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
