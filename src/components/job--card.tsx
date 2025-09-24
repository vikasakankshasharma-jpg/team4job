
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Job } from "@/lib/types";
import { MapPin, Briefcase, IndianRupee, Clock, Users } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow, format } from 'date-fns';
import { getStatusVariant } from "@/lib/utils";
import React from "react";
import { cn } from "@/lib/utils";

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
      setPostedAt(format(new Date(job.postedAt), "MMM d, yyyy"));
    }
  }, [job.deadline, job.postedAt]);

  const statusVariant = getStatusVariant(job.status);

  return (
    <Card className="flex flex-col relative">
      <CardHeader>
        <div className="flex items-center justify-between mb-2">
            <div className="flex-1">
                <Badge variant={statusVariant} className="capitalize">
                    {job.status}
                </Badge>
            </div>
            <span className="text-xs text-muted-foreground font-mono">#{job.id}</span>
        </div>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Avatar>
              <AvatarImage src={job.jobGiver.avatarUrl} alt={job.jobGiver.name} data-ai-hint="person face" />
              <AvatarFallback>{job.jobGiver.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-semibold">{job.jobGiver.name}</p>
              <p className="text-xs text-muted-foreground">
                Posted {postedAt}
              </p>
            </div>
          </div>
        </div>
        <CardTitle className="pt-4 text-lg">{job.title}</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow">
        <div className="space-y-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            <span>{job.location}</span>
          </div>
          <div className="flex items-center gap-2">
            <IndianRupee className="h-4 w-4" />
            <span>{job.budget.min} - {job.budget.max}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span>{job.bids.length} Bids</span>
          </div>
          <div className="flex items-center gap-2 text-primary">
            <Clock className="h-4 w-4" />
            <span>Bidding ends {timeRemaining}</span>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button asChild className="w-full">
          <Link href={`/dashboard/jobs/${job.id}`}>View Job & Bid</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

