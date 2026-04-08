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
import { Avatar } from "@/components/ui/avatar";
import type { Job, User } from "@/lib/types";
import { 
    MapPin, 
    IndianRupee, 
    Clock, 
    Users, 
    User as UserIcon, 
    Hash, 
    ArrowRight, 
    Lock as LockIcon, 
    Sparkles,
    Zap,
    TrendingUp
} from "lucide-react";
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

  const professionalId = user?.id;
  const professionalTierPriority = user?.professionalProfile?.tierPriority || 1;
  const isTierRestricted = job.minTierPriority && professionalTierPriority < job.minTierPriority;

  const getButtonText = () => {
    if (myBidStatus) {
      const statusText = myBidStatus.text.toLowerCase();
      if (statusText.includes('awarded') || statusText.includes('progress') || statusText.includes('funding')) return "Respond to Award";
      if (statusText.includes('completed')) return 'View Accomplishment';
    }
    if (isTierRestricted) return 'Tier Restricted';
    
    const s = job.status?.toLowerCase() || '';
    if (s === 'open for bidding' || s === 'open') return hasBidded ? 'Modify Bid' : 'Place Bid';
    if (s === 'bidding closed') return 'Bidding Closed';
    
    return 'View Production';
  }

  const buttonText = getButtonText();
  const buttonVariant = statusVariant === 'success' ? 'success' : statusVariant === 'warning' ? 'warning' : statusVariant === 'info' ? 'info' : 'default';

  return (
    <motion.div
        whileHover={{ y: -10 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className="h-full"
    >
        <Card
            className="flex flex-col h-full relative border-none bg-surface-container-low/60 backdrop-blur-xl shadow-2xl rounded-[3rem] group overflow-hidden transition-all duration-500 ring-1 ring-white/5"
            data-job-id={job.id}
            data-testid="job-card"
        >
            {/* Top Status Gradient Accent */}
            <div className={cn(
                "absolute top-0 left-0 w-full h-2 bg-gradient-to-r transition-all duration-500",
                job.status === 'Open for Bidding' || job.status === 'open' ? "from-blue-500 to-primary" :
                job.status === 'Awarded' ? "from-amber-500 to-amber-300" :
                job.status === 'In Progress' ? "from-primary to-accent" :
                job.status === 'Completed' ? "from-success to-green-400" :
                "from-slate-500 to-slate-300"
            )} />

            <CardHeader className="p-10 pb-6 relative">
                <div className="absolute top-0 right-0 p-8 opacity-5 scale-150 rotate-12 group-hover:scale-125 transition-transform duration-700 pointer-events-none">
                    <Sparkles className="h-24 w-24 text-primary" />
                </div>

                <div className="flex items-start justify-between gap-4 relative z-10">
                    <div className="flex-1 space-y-5">
                        <div className="flex items-center gap-3 flex-wrap">
                            <Badge variant={statusVariant} className="px-5 py-1.5 rounded-full font-black text-[10px] uppercase tracking-[0.15em] shadow-xl border-none">
                                {displayStatus}
                            </Badge>
                            <DummyDataBadge isDummyData={job.isDummyData} />
                            {isNearby && (
                                <Badge className="px-5 py-1.5 rounded-full bg-success/20 text-success border-none font-black text-[10px] uppercase tracking-[0.15em] italic">
                                    <MapPin className="h-3 w-3 mr-2" /> Nearby Node
                                </Badge>
                            )}
                            {job.isUrgent && (
                                <Badge className="px-5 py-1.5 rounded-full bg-destructive/20 text-destructive border-none font-black text-[10px] uppercase tracking-[0.15em] animate-pulse">
                                    <Zap className="h-3 w-3 mr-2" /> High Urgency
                                </Badge>
                            )}
                        </div>

                        <div className="space-y-2">
                            <CardTitle className="text-3xl font-black italic tracking-tighter leading-[1.1] line-clamp-2 bg-gradient-to-br from-foreground to-foreground/40 bg-clip-text text-transparent group-hover:from-primary group-hover:to-primary/60 transition-all duration-500">
                                {job.title}
                            </CardTitle>
                            <div className="flex items-center gap-3 text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.3em] font-mono">
                                <Hash className="h-3 w-3" /> {job.id.slice(-8)}
                            </div>
                        </div>
                    </div>
                    <div className="flex-shrink-0">
                        <BookmarkButton jobId={job.id} className="opacity-40 hover:opacity-100 hover:scale-110 transition-all" />
                    </div>
                </div>
            </CardHeader>

            <CardContent className="px-10 flex-grow relative z-10">
                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-5">
                        <div className="bg-surface-container-high/40 p-5 rounded-[2rem] border border-white/5 space-y-1.5 group/stat shadow-inner transition-colors hover:bg-surface-container-high/60">
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] italic opacity-60">Production Bids</p>
                            <div className="flex items-center gap-3">
                                <div className="p-1.5 rounded-lg bg-primary/10 text-primary group-hover/stat:scale-110 transition-transform">
                                    <Users className="h-5 w-5" />
                                </div>
                                <span className="font-black italic text-2xl tracking-tighter">{job.bids?.length || 0}</span>
                            </div>
                        </div>
                        <div className="bg-surface-container-high/40 p-5 rounded-[2rem] border border-white/5 space-y-1.5 group/stat shadow-inner transition-colors hover:bg-surface-container-high/60">
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] italic opacity-60">Target Budget</p>
                            <div className="flex items-center gap-3">
                                <div className="p-1.5 rounded-lg bg-green-500/10 text-green-600 dark:text-green-400 group-hover/stat:scale-110 transition-transform">
                                    <TrendingUp className="h-5 w-5" />
                                </div>
                                <span className="font-black italic text-2xl tracking-tighter text-green-700 dark:text-green-400">
                                    ₹{job.priceEstimate ? (job.priceEstimate.min >= 1000 ? `${(job.priceEstimate.min/1000).toFixed(0)}k` : job.priceEstimate.min) : '---'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-5 bg-foreground/[0.03] p-5 rounded-[2rem] border border-white/5 transition-all group-hover:bg-foreground/[0.06] shadow-inner">
                        <div className="p-3 bg-background rounded-2xl shadow-xl ring-1 ring-white/5">
                            <MapPin className="h-6 w-6 text-primary" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] italic opacity-60">Geo-Location Node</p>
                            <p className="font-black text-sm line-clamp-1 italic tracking-tight text-on-surface">
                                {job.status === 'In Progress' || job.status === 'Completed' ? job.location : job.location.split(',')[0]}
                            </p>
                        </div>
                    </div>
                </div>
            </CardContent>

            <CardFooter className="p-10 pt-6 flex flex-col gap-8 relative z-10">
                <div className="flex items-center gap-4 w-full border-t border-white/5 pt-8">
                    <Avatar className="h-12 w-12 border-2 border-background shadow-2xl ring-2 ring-primary/20">
                        <div className="h-full w-full bg-gradient-to-br from-primary/10 to-primary/30 flex items-center justify-center">
                            <UserIcon className="h-6 w-6 text-primary" />
                        </div>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] opacity-40 italic">Log Entry: {postedAt}</p>
                        <p className="text-[11px] font-black text-amber-500/80 flex items-center gap-2 uppercase tracking-widest mt-0.5">
                            <Clock className="h-4 w-4" /> Closure: {timeRemaining}
                        </p>
                    </div>
                </div>

                <Button 
                    asChild 
                    className={cn(
                        "w-full h-16 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl transition-all duration-500 active:scale-95 group/btn relative overflow-hidden",
                        isTierRestricted ? "opacity-60 cursor-not-allowed" : "hover:shadow-primary/40 shadow-primary/20"
                    )} 
                    variant={isTierRestricted ? 'outline' : buttonVariant}
                >
                    <Link href={`/dashboard/jobs/${job.id}`} className="flex items-center justify-center gap-3">
                        <span className="relative z-10 flex items-center gap-3">
                            {isTierRestricted ? <LockIcon className="h-5 w-5" /> : <Zap className="h-5 w-5" />}
                            {buttonText}
                        </span>
                        <ArrowRight className="h-5 w-5 transition-transform group-hover/btn:translate-x-2 relative z-10" />
                        <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                    </Link>
                </Button>
            </CardFooter>
        </Card>
    </motion.div>
  );
}

// Utility local since we can't edit utils.ts easily right now if it doesn't have cn
function cn(...inputs: any[]) {
    return inputs.filter(Boolean).join(' ');
}
