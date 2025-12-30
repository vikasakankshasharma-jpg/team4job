
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
import { MapPin, IndianRupee, Clock, Users, User as UserIcon, Star, Gift } from "lucide-react";
import Link from "next/link";
import { format, formatDistanceToNow } from 'date-fns';
import { getStatusVariant, toDate, getMyBidStatus } from "@/lib/utils";
import React from "react";
import { AnimatedAvatar } from "./ui/animated-avatar";
import { CardDescription } from "./ui/card";
import { useUser } from "@/hooks/use-user";

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
    <Card className="flex flex-col relative">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant={statusVariant} className="capitalize">
                {displayStatus}
              </Badge>
              {job.travelTip && job.travelTip > 0 && (
                <Badge variant="warning" className="gap-1"><Gift className="h-3 w-3" /> Tip Included</Badge>
              )}
            </div>
            <CardTitle className="text-lg leading-tight">{job.title}</CardTitle>
            <CardDescription className="font-mono text-xs pt-1">{job.id}</CardDescription>
          </div>
        </div>
        <div className="flex items-center gap-3 pt-4">
          <Avatar className="h-9 w-9 bg-muted border flex items-center justify-center">
            <UserIcon className="h-5 w-5 text-muted-foreground" />
          </Avatar>
          <div>
            <p className="font-semibold text-sm text-foreground">Job Giver</p>
            <p className="text-xs text-muted-foreground">
              Posted {postedAt}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-2 text-foreground">
            <MapPin className="h-4 w-4" />
            <span className={job.status !== 'In Progress' && job.status !== 'Completed' ? "blur-[2px] hover:blur-none transition-all cursor-crosshair ml-1" : ""}>
              {job.status === 'In Progress' || job.status === 'Completed' ? job.location : job.location.split(',')[0] + " (Area)"}
            </span>
            {/* Privacy: Hide full address until awarded */}
          </div>
          <div className="flex items-center gap-2 text-foreground">
            <Users className="h-4 w-4" />
            <span>{job.bids.length} Bids</span>
          </div>
          {job.travelTip && job.travelTip > 0 && (
            <div className="flex items-center gap-2 text-primary font-medium">
              <IndianRupee className="h-4 w-4" />
              <span>₹{job.travelTip.toLocaleString()} Travel Tip</span>
            </div>
          )}
          {job.status === 'Open for Bidding' && (
            <div className="flex items-center gap-2 text-primary font-medium">
              <Clock className="h-4 w-4" />
              <span>Bidding ends {timeRemaining}</span>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex flex-col items-center gap-2">
        <Button asChild className="w-full" variant={job.status === 'Completed' || job.status === 'Unbid' ? "outline" : buttonVariant}>
          <Link href={`/dashboard/jobs/${job.id}`}>{buttonText}</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

