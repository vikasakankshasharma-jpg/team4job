
"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Job } from "@/lib/types";
import { MapPin, Briefcase, IndianRupee, Clock, Users } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow, format } from 'date-fns';
import { cn, getStatusVariant } from "@/lib/utils";
import React from "react";

type JobCardProps = {
  job: Job;
};

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

export function JobCard({ job }: JobCardProps) {
  const [postedAt, setPostedAt] = React.useState("");
  const [timeRemaining, setTimeRemaining] = React.useState("");
  
  React.useEffect(() => {
    if (job.postedAt) {
      setPostedAt(format(new Date(job.postedAt), "MMM d, yyyy"));
    }
    if (job.deadline) {
      setTimeRemaining(formatDistanceToNow(new Date(job.deadline), { addSuffix: true }));
    }
  }, [job.postedAt, job.deadline]);


  const statusVariant = getStatusVariant(job.status);
  const buttonText = getButtonText(job.status);
  const buttonVariant = statusVariant === 'success' ? 'success' : statusVariant === 'warning' ? 'warning' : statusVariant === 'info' ? 'info' : 'default';

  return (
    <Card className="flex flex-col relative pt-6">
       <Badge variant={statusVariant} className="capitalize absolute -top-3 left-1/2 -translate-x-1/2">
            {job.status}
          </Badge>
      <CardHeader>
        <CardTitle className="text-lg mb-2">{job.title}</CardTitle>
        <div className="flex justify-between items-center text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={job.jobGiver.avatarUrl} alt={job.jobGiver.name} data-ai-hint="person face" />
                  <AvatarFallback>{job.jobGiver.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-sm text-foreground">{job.jobGiver.name}</p>
                  <p>
                    Posted {postedAt}
                  </p>
                </div>
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
         <span className="text-xs text-muted-foreground font-mono">#{job.id}</span>
      </CardFooter>
    </Card>
  );
}
