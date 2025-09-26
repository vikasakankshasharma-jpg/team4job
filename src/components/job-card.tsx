
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
import type { Job } from "@/lib/types";
import { MapPin, IndianRupee, Clock, Users } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow, format } from 'date-fns';
import { getStatusVariant } from "@/lib/utils";
import React from "react";
import { AnimatedAvatar } from "./ui/animated-avatar";

type JobCardProps = {
  job: Job;
};

export function JobCard({ job }: JobCardProps) {
  const [timeRemaining, setTimeRemaining] = React.useState('');
  const [postedAt, setPostedAt] = React.useState('');

  React.useEffect(() => {
    if (job.deadline) {
      setTimeRemaining(formatDistanceToNow(new Date(job.deadline), { addSuffix: true }));
    }
    if (job.postedAt) {
      setPostedAt(formatDistanceToNow(new Date(job.postedAt), { addSuffix: true }));
    }
  }, [job.deadline, job.postedAt]);

  const statusVariant = getStatusVariant(job.status);
  
  const getButtonText = (status: Job['status']) => {
    switch (status) {
      case 'Open for Bidding':
        return 'View Job & Bid';
      case 'Bidding Closed':
        return 'View Bids';
      case 'Awarded':
      case 'In Progress':
        return 'View Job Details';
      case 'Completed':
        return 'View Archived Job';
      default:
        return 'View Job';
    }
  }

  const buttonText = getButtonText(job.status);
  const buttonVariant = statusVariant === 'success' ? 'success' : statusVariant === 'warning' ? 'warning' : statusVariant === 'info' ? 'info' : 'default';

  return (
    <Card className="flex flex-col relative">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <Badge variant={statusVariant} className="capitalize mb-4">
              {job.status}
            </Badge>
            <CardTitle className="text-lg">{job.title}</CardTitle>
          </div>
           <span className="text-xs text-muted-foreground font-mono">#{job.id.substring(job.id.lastIndexOf('-') + 1)}</span>
        </div>
         <div className="flex items-center gap-3 pt-4">
            <Avatar className="h-9 w-9">
              <AnimatedAvatar svg={job.jobGiver.avatarUrl} />
              <AvatarFallback>{job.jobGiver.anonymousId.substring(0, 2)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-sm text-foreground">{job.jobGiver.anonymousId}</p>
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
            <span>{job.location}</span>
          </div>
          <div className="flex items-center gap-2 text-foreground">
            <IndianRupee className="h-4 w-4" />
            <span>{job.budget.min} - {job.budget.max}</span>
          </div>
          <div className="flex items-center gap-2 text-foreground">
            <Users className="h-4 w-4" />
            <span>{job.bids.length} Bids</span>
          </div>
          {job.status === 'Open for Bidding' && (
             <div className="flex items-center gap-2 text-primary font-medium">
              <Clock className="h-4 w-4" />
              <span>Bidding ends {timeRemaining}</span>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex flex-col items-center gap-2">
        <Button asChild className="w-full" variant={job.status === 'Completed' ? "outline" : buttonVariant}>
          <Link href={`/dashboard/jobs/${job.id}`}>{buttonText}</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
