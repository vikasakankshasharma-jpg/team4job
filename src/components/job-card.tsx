
"use client";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Job, User } from "@/lib/types";
import { MapPin, IndianRupee, Clock, Users, User as UserIcon, Star, Gift, RefreshCw, Hash } from "lucide-react";
import Link from "next/link";
import { format, formatDistanceToNow } from 'date-fns';
import { getStatusVariant, toDate, getMyBidStatus } from "@/lib/utils";
import React from "react";
import { AnimatedAvatar } from "./ui/animated-avatar";
import { CardDescription } from "./ui/card";
import { useUser } from "@/hooks/use-user";
import { BookmarkButton } from "@/components/jobs/bookmark-button";
import { DummyDataBadge } from "@/components/jobs/dummy-data-badge";

type JobCardProps = {
  job: Job;
};

export function JobCard({ job }: JobCardProps) {
  const { user } = useUser();
  const [timeRemaining, setTimeRemaining] = React.useState('');
  const [postedAt, setPostedAt] = React.useState('');

  React.useEffect(() => {
    if (job.deadline) {
      setTimeRemaining(formatDistanceToNow(toDate(job.deadline), { addSuffix: true }));
    }
    if (job.postedAt) {
      setPostedAt(formatDistanceToNow(toDate(job.postedAt), { addSuffix: true }));
    }
  }, [job.deadline, job.postedAt]);

  // Check if job is in Professional's pincode area
  const isNearby = React.useMemo(() => {
    if (!user?.pincodes || !job.location) return false;
    const locationLower = job.location.toLowerCase();
    const residentialMatch = user.pincodes.residential && locationLower.includes(user.pincodes.residential);
    const officeMatch = user.pincodes.office && locationLower.includes(user.pincodes.office);
    return residentialMatch || officeMatch;
  }, [user, job.location]);

  // Check if job is unbid (no bids yet)
  const isUnbid = job.status === 'Unbid' || (job.status === 'Open for Bidding' && ((job.bids as any)?.length || 0) === 0);

  const hasBidded = user && job.bidderIds?.includes(user.id);
  const myBidStatus = hasBidded && user ? getMyBidStatus(job, user) : null;

  const displayStatus = myBidStatus ? myBidStatus.text : job.status;
  const statusVariant = myBidStatus ? myBidStatus.variant : getStatusVariant(job.status);

  const getButtonText = () => {
    if (myBidStatus) {
      if (myBidStatus.text === 'Awarded to You' || myBidStatus.text === 'In Progress' || myBidStatus.text === 'Pending Funding') return "View Job & Respond";
      if (myBidStatus.text === 'Completed & Won') return 'View Completed Job';
    }
    switch (job.status) {
      case 'Open for Bidding':
        return hasBidded ? 'View & Modify Bid' : 'View Job & Bid';
      case 'Bidding Closed':
        return 'View Bids';
      case 'Awarded':
      case 'In Progress':
      case 'Pending Funding':
        return 'View Job Details';
      case 'Completed':
        return 'View Archived Job';
      case 'Unbid':
        return 'View Job';
      default:
        return 'View Job';
    }
  }

  const buttonText = getButtonText();
  const buttonVariant = statusVariant === 'success' ? 'success' : statusVariant === 'warning' ? 'warning' : statusVariant === 'info' ? 'info' : 'default';

  return (
    <Card
      className="flex flex-col relative transition-all duration-300 hover:-translate-y-1 hover:shadow-xl border-border/50 hover:border-primary/20 bg-card group overflow-hidden"
      data-job-id={job.id}
      data-testid="job-card"
    >
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={statusVariant} className="capitalize font-semibold tracking-wide text-[10px] uppercase shadow-sm">
                {displayStatus}
              </Badge>
              <DummyDataBadge isDummyData={job.isDummyData} />
              {job.travelTip && job.travelTip > 0 && (
                <Badge variant="warning" className="gap-1 font-semibold tracking-wide text-[10px] uppercase shadow-sm"><Gift className="h-3 w-3" /> Tip Included</Badge>
              )}
              {isNearby && (
                <Badge variant="default" className="gap-1 font-semibold tracking-wide text-[10px] uppercase shadow-sm bg-success hover:bg-success/90">
                  <MapPin className="h-3 w-3" /> Near You
                </Badge>
              )}
              {isUnbid && (
                <Badge variant="secondary" className="gap-1 font-semibold tracking-wide text-[10px] uppercase shadow-sm border border-amber-500/30 text-amber-700 bg-amber-500/10 dark:text-amber-400">
                  <RefreshCw className="h-3 w-3" /> Second Chance
                </Badge>
              )}
            </div>
            <div>
              <CardTitle className="text-xl font-bold leading-tight line-clamp-2 group-hover:text-primary transition-colors">{job.title}</CardTitle>
              <CardDescription className="font-mono text-xs pt-1.5 opacity-60 flex items-center gap-1.5">
                  <Hash className="h-3 w-3" /> {job.id}
              </CardDescription>
            </div>
          </div>
          <BookmarkButton jobId={job.id} className="-mt-1 opacity-50 group-hover:opacity-100 transition-opacity" />
        </div>
        <div className="flex items-center gap-3 pt-5 border-t border-border/40 mt-2">
          <Avatar className="h-10 w-10 bg-muted/50 border-2 border-background shadow-sm flex items-center justify-center">
            <UserIcon className="h-5 w-5 text-muted-foreground/70" />
          </Avatar>
          <div className="flex flex-col">
            <p className="font-bold text-sm text-foreground">Client</p>
            <p className="text-xs font-medium text-muted-foreground/80 flex items-center gap-1">
              <Clock className="h-3 w-3" /> Posted {postedAt}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-grow pb-4">
        <div className="space-y-4 text-sm bg-muted/10 p-4 rounded-xl border border-muted-foreground/10">
          <div className="flex items-center gap-3 text-foreground/90 font-medium">
            <div className="p-1.5 bg-background rounded-md shadow-sm border border-border/50">
                <MapPin className="h-4 w-4 text-primary/70" />
            </div>
            <span className={job.status !== 'In Progress' && job.status !== 'Completed' ? "blur-[3px] hover:blur-none transition-all duration-300 cursor-crosshair select-none" : ""}>
              {job.status === 'In Progress' || job.status === 'Completed' ? job.location : job.location.split(',')[0] + " (Area)"}
            </span>
          </div>
          <div className="flex items-center gap-3 text-foreground/90 font-medium">
            <div className="p-1.5 bg-background rounded-md shadow-sm border border-border/50">
                <Users className="h-4 w-4 text-primary/70" />
            </div>
            <span>{job.bids.length} Bids</span>
          </div>
          {job.travelTip && job.travelTip > 0 && (
            <div className="flex items-center gap-3 text-primary font-bold">
              <div className="p-1.5 bg-primary/10 rounded-md shadow-sm border border-primary/20">
                  <IndianRupee className="h-4 w-4" />
              </div>
              <span>₹{job.travelTip.toLocaleString()} Travel Tip</span>
            </div>
          )}
          {job.status === 'Open for Bidding' && (
            <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400 font-bold">
              <div className="p-1.5 bg-amber-500/10 rounded-md shadow-sm border border-amber-500/20">
                  <Clock className="h-4 w-4" />
              </div>
              <span>Ends {timeRemaining}</span>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="pt-2 pb-6">
        <Button asChild className="w-full font-bold shadow-sm transition-transform active:scale-[0.98]" variant={job.status === 'Completed' || job.status === 'Unbid' ? "outline" : buttonVariant}>
          <Link href={`/dashboard/jobs/${job.id}`}>{buttonText}</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

