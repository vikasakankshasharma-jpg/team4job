import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import type { Job } from "@/lib/types";
import { MapPin, IndianRupee, Clock, Users, User as UserIcon, Hash, ArrowRight } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from 'date-fns';
import { getStatusVariant, toDate, getMyBidStatus } from "@/lib/utils";
import React from "react";
import { useUser } from "@/hooks/use-user";
import { BookmarkButton } from "@/components/jobs/bookmark-button";
import { DummyDataBadge } from "@/components/jobs/dummy-data-badge";
import { motion } from "framer-motion";

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

  const isNearby = React.useMemo(() => {
    if (!user?.pincodes || !job.location) return false;
    const locationLower = job.location.toLowerCase();
    const residentialMatch = user.pincodes.residential && locationLower.includes(user.pincodes.residential);
    const officeMatch = user.pincodes.office && locationLower.includes(user.pincodes.office);
    return residentialMatch || officeMatch;
  }, [user, job.location]);

  const isUnbid = job.status === 'Unbid' || (job.status === 'Open for Bidding' && ((job.bids as any)?.length || 0) === 0);
  const hasBidded = user && job.bidderIds?.includes(user.id);
  const myBidStatus = hasBidded && user ? getMyBidStatus(job, user) : null;
  const displayStatus = myBidStatus ? myBidStatus.text : job.status;
  const statusVariant = myBidStatus ? myBidStatus.variant : getStatusVariant(job.status);

  const getButtonText = () => {
    if (myBidStatus) {
      if (myBidStatus.text === 'Awarded to You' || myBidStatus.text === 'In Progress' || myBidStatus.text === 'Pending Funding') return "View & Respond";
      if (myBidStatus.text === 'Completed & Won') return 'View Completed';
    }
    switch (job.status) {
      case 'Open for Bidding': return hasBidded ? 'Modify Bid' : 'View & Bid';
      case 'Bidding Closed': return 'View Bids';
      default: return 'View Details';
    }
  }

  const buttonText = getButtonText();
  const buttonVariant = statusVariant === 'success' ? 'success' : statusVariant === 'warning' ? 'warning' : statusVariant === 'info' ? 'info' : 'default';

  return (
    <motion.div
        whileHover={{ y: -8, scale: 1.02 }}
        className="h-full"
    >
        <Card
        className="flex flex-col h-full relative border-none bg-card/40 backdrop-blur-xl shadow-2xl rounded-[2.5rem] group overflow-hidden transition-all duration-500 hover:bg-card/60"
        data-job-id={job.id}
        data-testid="job-card"
        >
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary/50 via-primary to-primary/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        <CardHeader className="p-8 pb-4">
            <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={statusVariant} className="px-3 py-1 rounded-full font-black text-[9px] uppercase tracking-wider shadow-lg">
                        {displayStatus}
                    </Badge>
                    <DummyDataBadge isDummyData={job.isDummyData} />
                    {isNearby && (
                        <Badge className="px-3 py-1 rounded-full bg-success/20 text-success border-none font-black text-[9px] uppercase tracking-wider">
                            <MapPin className="h-3 w-3 mr-1" /> Near You
                        </Badge>
                    )}
                </div>
                <div className="space-y-1">
                    <CardTitle className="text-2xl font-black tracking-tight leading-tight line-clamp-2 bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent group-hover:from-primary group-hover:to-primary/60 transition-all duration-500">
                        {job.title}
                    </CardTitle>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
                        <Hash className="h-3 w-3" /> {job.id.slice(-8)}
                    </div>
                </div>
            </div>
            <BookmarkButton jobId={job.id} className="opacity-40 group-hover:opacity-100 transition-opacity duration-500" />
            </div>
        </CardHeader>

        <CardContent className="px-8 flex-grow">
            <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-foreground/[0.03] p-4 rounded-3xl border border-foreground/[0.05] space-y-1">
                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Bids</p>
                        <div className="flex items-center gap-2 font-black text-lg">
                            <Users className="h-4 w-4 text-primary" />
                            {job.bids.length}
                        </div>
                    </div>
                    <div className="bg-foreground/[0.03] p-4 rounded-3xl border border-foreground/[0.05] space-y-1">
                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Budget</p>
                        <div className="flex items-center gap-2 font-black text-lg text-primary">
                            <IndianRupee className="h-4 w-4" />
                            {job.priceEstimate ? (job.priceEstimate.min >= 1000 ? `${(job.priceEstimate.min/1000).toFixed(0)}k` : job.priceEstimate.min) : 'N/A'}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4 bg-primary/5 p-4 rounded-[1.5rem] border border-primary/10 transition-colors group-hover:bg-primary/10">
                    <div className="p-2 bg-background rounded-xl shadow-inner">
                        <MapPin className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Location</p>
                        <p className="font-bold text-sm line-clamp-1 italic">
                        {job.status === 'In Progress' || job.status === 'Completed' ? job.location : job.location.split(',')[0]}
                        </p>
                    </div>
                </div>
            </div>
        </CardContent>

        <CardFooter className="p-8 pt-4 flex flex-col gap-6">
            <div className="flex items-center gap-3 w-full border-t border-foreground/5 pt-6">
                <Avatar className="h-10 w-10 border-2 border-background shadow-xl">
                    <div className="h-full w-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
                        <UserIcon className="h-5 w-5 text-primary" />
                    </div>
                </Avatar>
                <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Posted {postedAt}</p>
                    <p className="text-xs font-bold text-amber-500 flex items-center gap-1.5 uppercase tracking-tighter">
                        <Clock className="h-3.5 w-3.5" /> {timeRemaining}
                    </p>
                </div>
            </div>

            <Button asChild className="w-full h-14 rounded-[1.5rem] font-black text-base shadow-2xl transition-all duration-500 hover:shadow-primary/20 group/btn" variant={buttonVariant}>
                <Link href={`/dashboard/jobs/${job.id}`} className="flex items-center justify-center gap-2">
                    {buttonText} <ArrowRight className="h-5 w-5 transition-transform group-hover/btn:translate-x-1" />
                </Link>
            </Button>
        </CardFooter>
        </Card>
    </motion.div>
  );
}

