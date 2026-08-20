"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Award, IndianRupee, ListFilter, X, Loader2, List, Grid, Trash2, ArrowRight, Clock, Hash } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Job, Bid, User } from "@/lib/types";
import React, { useEffect, useCallback, useMemo } from "react";
import { getStatusVariant, toDate, getMyBidStatus, getRefId } from "@/lib/utils";
import { useUser } from "@/hooks/use-user";
import { useFirebase } from "@/infrastructure/firebase/client-provider";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useHelp } from "@/hooks/use-help";
import { doc, deleteDoc } from "firebase/firestore";
import { EmptyState } from "@/components/ui/empty-state";
import { Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

interface BidItemProps {
  bid: Bid & { jobId: string; id: string };
  job: Job;
  user: User;
  onWithdraw: (bidId: string, jobId: string) => void;
}

function MyBidRow({ bid, job, user, onWithdraw }: BidItemProps) {
  const t = useTranslations('myBids');
  const timeAgo = formatDistanceToNow(toDate(bid.timestamp), { addSuffix: true });
  const myBidStatus = getMyBidStatus(job, user);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const canWithdraw = job.status === 'Open for Bidding' || job.status?.toLowerCase() === 'open';

  const handleDelete = async () => {
    if (!confirm(t('withdrawConfirm'))) return;
    setIsDeleting(true);
    await onWithdraw(bid.id, bid.jobId);
    setIsDeleting(false);
  }

  const pointsEarned = useMemo(() => {
    if (job.status !== 'Completed' || getRefId(job.awardedProfessional) !== user.id || !job.rating) return null;
    const ratingPoints = job.rating === 5 ? 20 : job.rating === 4 ? 10 : 0;
    return 50 + ratingPoints;
  }, [job, user.id]);

  return (
    <motion.tr variants={itemVariants} className="group/row transition-colors hover:bg-foreground/[0.02]">
      <TableCell className="py-6">
        <div className="flex flex-col gap-1">
            <Link href={`/dashboard/jobs/${bid.jobId}`} className="font-black text-base hover:text-primary transition-colors underline-offset-4 hover:underline">{job.title}</Link>
            <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
                <Hash className="h-3 w-3" /> {job.id.slice(-8)}
            </div>
        </div>
      </TableCell>
      <TableCell className="py-6 font-black text-primary">
        {bid.amount > 0 ? (
          <div className="flex items-center gap-1.5 bg-primary/5 px-3 py-1.5 rounded-full w-fit border border-primary/10">
            <IndianRupee className="h-3.5 w-3.5" />
            {bid.amount.toLocaleString()}
          </div>
        ) : (
          <Badge variant="outline" className="opacity-60">{t('directAward')}</Badge>
        )}
      </TableCell>
      <TableCell className="hidden md:table-cell py-6 text-xs font-bold text-muted-foreground uppercase tracking-tighter italic">
        <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5" /> {timeAgo}
        </div>
      </TableCell>
      <TableCell className="py-6">
        <Badge variant={getStatusVariant(job.status)} className="px-3 py-1 rounded-full font-black text-[9px] uppercase tracking-wider shadow-sm">
            {job.status}
        </Badge>
      </TableCell>
      <TableCell className="py-6">
        <Badge variant={myBidStatus.variant} className="px-3 py-1 rounded-full font-black text-[9px] uppercase tracking-wider shadow-sm border-none bg-primary/10 text-primary">
            {myBidStatus.text}
        </Badge>
      </TableCell>
      <TableCell className="text-right py-6">
        {pointsEarned !== null ? (
          <div className="flex items-center justify-end gap-1.5 font-black text-success italic tracking-tighter">
            <Award className="h-5 w-5" />
            +{pointsEarned} {t('pts')}
          </div>
        ) : (
          canWithdraw ? (
            <Button variant="ghost" size="sm" className="h-9 rounded-full text-destructive hover:text-destructive hover:bg-destructive/10 font-bold transition-all" onClick={handleDelete} disabled={isDeleting} data-testid="withdraw-bid-button">
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              {t('withdraw')}
            </Button>
          ) : (
            <Link href={`/dashboard/jobs/${bid.jobId}`}>
                <Button variant="outline" size="sm" className="h-9 rounded-full font-bold group/btn">
                    Details <ArrowRight className="h-3.5 w-3.5 ml-2 transition-transform group-hover/btn:translate-x-1" />
                </Button>
            </Link>
          )
        )}
      </TableCell>
    </motion.tr>
  );
}

function MyBidCard({ bid, job, user, onWithdraw }: BidItemProps) {
  const t = useTranslations('myBids');
  const router = useRouter();
  const myBidStatus = getMyBidStatus(job, user);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const canWithdraw = job.status === 'Open for Bidding' || job.status?.toLowerCase() === 'open';

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(t('withdrawConfirm'))) return;
    setIsDeleting(true);
    await onWithdraw(bid.id, bid.jobId);
    setIsDeleting(false);
  }

  return (
    <motion.div variants={itemVariants} whileHover={{ y: -5, scale: 1.02 }} className="h-full">
        <Card onClick={() => router.push(`/dashboard/jobs/${bid.jobId}`)} className="h-full cursor-pointer relative group border-none bg-card/40 backdrop-blur-xl shadow-2xl rounded-[2rem] overflow-hidden transition-all duration-500 hover:bg-card/60">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/30 to-primary/60" />
            {canWithdraw && (
                <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 h-10 w-10 rounded-full opacity-0 group-hover:opacity-100 transition-all text-destructive hover:text-destructive hover:bg-destructive/10 z-10"
                onClick={handleDelete}
                disabled={isDeleting}
                data-testid="withdraw-bid-button"
                >
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </Button>
            )}
            <CardHeader className="p-6 pb-4">
                <div className="flex items-start justify-between gap-4 mb-4">
                    <Badge variant={myBidStatus.variant} className="px-3 py-1 rounded-full font-black text-[9px] uppercase tracking-wider shadow-sm border-none bg-primary/10 text-primary">
                        {myBidStatus.text}
                    </Badge>
                    <div className="flex items-center gap-1.5 text-[10px] font-black text-muted-foreground/40 italic">
                        <Hash className="h-3 w-3" /> {job.id.slice(-8)}
                    </div>
                </div>
                <CardTitle className="text-xl font-black tracking-tight leading-tight line-clamp-2 group-hover:text-primary transition-colors">{job.title}</CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0 space-y-5">
                <div className="flex items-center justify-between bg-foreground/[0.03] p-4 rounded-2xl border border-foreground/[0.05]">
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{t('yourBidLabel')}</span>
                    <span className="font-black text-base flex items-center gap-1.5 text-primary">
                        <IndianRupee className="h-4 w-4" />
                        {bid.amount.toLocaleString()}
                    </span>
                </div>
                <div className="flex items-center justify-between bg-foreground/[0.03] p-4 rounded-2xl border border-foreground/[0.05]">
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Job Status</span>
                    <Badge variant={getStatusVariant(job.status)} className="px-3 py-1 rounded-full font-black text-[9px] uppercase tracking-wider shadow-sm">
                        {job.status}
                    </Badge>
                </div>
            </CardContent>
            <CardFooter className="p-6 pt-0 border-t border-foreground/5 mt-2 overflow-hidden flex items-center justify-between">
                <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-tighter italic">
                    <Clock className="h-3.5 w-3.5" /> 
                    {formatDistanceToNow(toDate(bid.timestamp), { addSuffix: true })}
                </div>
                <ArrowRight className="h-5 w-5 text-primary opacity-40 group-hover:opacity-100 group-hover:translate-x-2 transition-all" />
            </CardFooter>
        </Card>
    </motion.div>
  );
}

export default function MyBidsClient() {
  const t = useTranslations('myBids');
  const tCommon = useTranslations('common');
  const { user, role, loading: userLoading } = useUser();
  const { db } = useFirebase();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const pathname = usePathname();
  const statusFilter = searchParams.get('status') || 'All';
  const { setHelp } = useHelp();

  const [jobs, setJobs] = React.useState<Job[]>([]);
  const [bids, setBids] = React.useState<(Bid & { jobId: string; id: string })[]>([]);
  const bidsRef = React.useRef(bids);
  React.useEffect(() => {
    bidsRef.current = bids;
  }, [bids]);
  const [loading, setLoading] = React.useState(true);
  const [loadMoreLoading, setLoadMoreLoading] = React.useState(false);
  const [hasMore, setHasMore] = React.useState(true);
  const [view, setView] = React.useState<'list' | 'grid'>('list');

  useEffect(() => {
    if (!userLoading && role && role !== 'Professional') {
      router.push('/dashboard');
    }
  }, [role, userLoading, router]);

  const fetchMyBids = useCallback(async (isLoadMore = false) => {
    if (!user || !role || role !== 'Professional') return;

    if (isLoadMore) {
      setLoadMoreLoading(true);
    } else {
      setLoading(true);
    }

    try {
      let lastTimestamp: string | undefined = undefined;
      const currentBids = bidsRef.current;
      if (isLoadMore && currentBids.length > 0) {
        const lastBid = currentBids[currentBids.length - 1];
        const timestamp = toDate(lastBid.timestamp);
        if (!isNaN(timestamp.getTime())) {
          lastTimestamp = timestamp.toISOString();
        }
      }

      const params = new URLSearchParams({
        userId: user.id,
        limit: '50',
        ...(lastTimestamp && { lastTimestamp })
      });

      const response = await fetch(`/api/bids/my-bids?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch bids');

      const data = await response.json();
      const fetchedBids = data.bids;

      if (isLoadMore) {
        setBids(prev => {
          const existingIds = new Set(prev.map(b => b.id));
          const unique = fetchedBids.filter((b: any) => !existingIds.has(b.id));
          return [...prev, ...unique];
        });
      } else {
        setBids(fetchedBids);
      }

      const uniqueJobsMap = new Map<string, Job>();
      fetchedBids.forEach((bid: any) => {
        if (bid.job) {
          uniqueJobsMap.set(bid.job.id, bid.job);
        }
      });

      if (isLoadMore) {
        setJobs(prev => {
          const combined = new Map<string, Job>();
          prev.forEach(job => combined.set(job.id, job));
          uniqueJobsMap.forEach((job, id) => combined.set(id, job));
          return Array.from(combined.values());
        });
      } else {
        setJobs(Array.from(uniqueJobsMap.values()));
      }

      setHasMore(data.hasMore !== false && fetchedBids.length === 50);
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong while fetching bids",
        variant: 'destructive',
      });
    } finally {
      if (isLoadMore) {
        setLoadMoreLoading(false);
      } else {
        setLoading(false);
      }
    }
  }, [user, role, toast]);

  React.useEffect(() => {
    if (!userLoading) {
      queueMicrotask(() => {
        fetchMyBids();
      });
    }
  }, [fetchMyBids, userLoading]);

  const handleWithdrawBid = async (bidId: string, jobId: string) => {
    if (!db) return;
    try {
      await deleteDoc(doc(db, "jobs", jobId, "bids", bidId));
      toast({ title: t('bidWithdrawn'), description: t('bidWithdrawnDesc') });
      setBids(prev => prev.filter(b => b.id !== bidId));
    } catch (error) {
      toast({ title: "Error", description: "Something went wrong", variant: "destructive" });
    }
  }

  useEffect(() => {
    setHelp({
      title: t('guide.title'),
      content: (
        <div className="space-y-4 text-sm">
          <p>{t('guide.content')}</p>
          <ul className="list-disc space-y-2 pl-5">
            <li><span className="font-semibold">{t('guide.biddedTitle')}</span> {t('guide.biddedDesc')}</li>
            <li><span className="font-semibold">{t('guide.awardedTitle')}</span> {t('guide.awardedDesc')}</li>
            <li><span className="font-semibold">{t('guide.inProgressTitle')}</span> {t('guide.inProgressDesc')}</li>
            <li><span className="font-semibold">{t('guide.completedTitle')}</span> {t('guide.completedDesc')}</li>
            <li><span className="font-semibold">{t('guide.notSelectedTitle')}</span> {t('guide.notSelectedDesc')}</li>
          </ul>
        </div>
      )
    });
  }, [setHelp, t]);

  const handleFilterChange = (newStatus: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newStatus && newStatus !== 'All') {
      params.set('status', newStatus);
    } else {
      params.delete('status');
    }
    router.replace(`${pathname}?${params.toString()}`);
  };

  const clearFilters = () => router.replace(pathname);

  const getMyBidStatusText = (job: Job, user: User): string => {
    const status = getMyBidStatus(job, user);
    return status.text;
  }

  const jobsById = React.useMemo(() => new Map(jobs.map(j => [j.id, j])), [jobs]);

  const sortedBids = React.useMemo(() =>
    bids.sort((a, b) => toDate(b.timestamp).getTime() - toDate(a.timestamp).getTime()),
    [bids]);

  const filteredBids = React.useMemo(() => {
    if (statusFilter === 'All') return sortedBids;
    return sortedBids.filter(bid => {
      const job = jobsById.get(bid.jobId);
      if (!job || !user) return false;
      return getMyBidStatusText(job, user) === statusFilter;
    });
  }, [sortedBids, jobsById, user, statusFilter]);

  if (userLoading || loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary opacity-40" />
            <p className="font-black text-xs uppercase tracking-[0.2em] animate-pulse">{tCommon('loading')}</p>
        </div>
      </div>
    );
  }

  const pageTitle = statusFilter === 'All' ? t('title') : t('titleFiltered', { status: statusFilter });
  const pageDescription = statusFilter === 'All' ? t('description') : t('descriptionFiltered', { status: statusFilter.toLowerCase() });
  const bidStatuses = [
    t('statuses.all'),
    t('statuses.bidded'),
    t('statuses.awarded'),
    t('statuses.inProgress'),
    t('statuses.completed'),
    t('statuses.notSelected'),
    t('statuses.cancelled')
  ];

  return (
    <motion.div 
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="max-w-full overflow-x-hidden px-4 sm:px-8 space-y-10 pb-20 font-sans selection:bg-blue-500 selection:text-white bg-surface dark:bg-slate-950 text-on-surface min-h-screen pt-8"
    >
      <motion.div variants={itemVariants} className="flex flex-col gap-2">
          <h1 className="text-3xl font-extrabold font-headline tracking-tighter md:text-5xl text-on-surface">
              {pageTitle}
          </h1>
          <p className="text-on-surface-variant font-medium text-lg max-w-2xl">
              {pageDescription}
          </p>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card className="border-none bg-surface-container-low dark:bg-slate-900 shadow-xl shadow-black/5 rounded-[2.5rem] overflow-hidden">
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 p-8 border-b border-outline-variant/10 bg-surface-container-highest dark:bg-slate-800/50">
            <div className="flex items-center gap-2 p-1.5 bg-foreground/5 backdrop-blur-md rounded-2xl border border-foreground/5">
                <Button variant={view === 'list' ? 'secondary' : 'ghost'} size="icon" className="h-10 w-10 rounded-xl" onClick={() => setView('list')} aria-label="List view">
                  <List className="h-5 w-5" />
                </Button>
                <Button variant={view === 'grid' ? 'secondary' : 'ghost'} size="icon" className="h-10 w-10 rounded-xl" onClick={() => setView('grid')} aria-label="Grid view">
                  <Grid className="h-5 w-5" />
                </Button>
            </div>
            
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="default" className="h-12 rounded-2xl gap-3 flex-1 sm:flex-none font-black text-xs uppercase tracking-widest">
                    <ListFilter className="h-4 w-4" />
                    <span>{tCommon('filter')}</span>
                    {statusFilter !== 'All' && <Badge variant="secondary" className="ml-2 rounded-full h-6 w-6 p-0 flex items-center justify-center text-[10px] bg-primary text-primary-foreground">1</Badge>}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[calc(100vw-2rem)] sm:w-64 rounded-2xl p-2">
                  <DropdownMenuLabel className="font-black text-[10px] uppercase tracking-widest text-muted-foreground pb-2">{t('filterByStatus')}</DropdownMenuLabel>
                  <DropdownMenuSeparator className="-mx-2 mb-2" />
                  <DropdownMenuRadioGroup value={statusFilter} onValueChange={handleFilterChange}>
                    {bidStatuses.map(status => (
                      <DropdownMenuRadioItem key={status} value={status} className="rounded-xl h-11 font-bold text-sm">{status}</DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
              {statusFilter !== 'All' && (
                <Button variant="ghost" size="default" onClick={clearFilters} className="h-12 rounded-2xl font-black text-xs uppercase tracking-widest">
                  <X className="h-4 w-4 mr-2" />
                  {t('clear')}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-8">
            <AnimatePresence mode="wait">
              {view === 'list' ? (
                <motion.div
                  key="list"
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  variants={containerVariants}
                >
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-foreground/5">
                        <TableHead className="font-black text-[10px] uppercase tracking-widest">{t('jobTitle')}</TableHead>
                        <TableHead className="font-black text-[10px] uppercase tracking-widest">{t('yourBid')}</TableHead>
                        <TableHead className="hidden md:table-cell font-black text-[10px] uppercase tracking-widest text-center">{t('placed')}</TableHead>
                        <TableHead className="font-black text-[10px] uppercase tracking-widest">{t('jobStatus')}</TableHead>
                        <TableHead className="font-black text-[10px] uppercase tracking-widest">{t('myBidStatus')}</TableHead>
                        <TableHead className="text-right font-black text-[10px] uppercase tracking-widest">{t('pointsEarned')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredBids.length > 0 ? (
                        filteredBids.map(bid => {
                          const job = jobsById.get(bid.jobId);
                          if (!job || !user) return null;
                          return <MyBidRow key={bid.id || bid.jobId} bid={bid} job={job} user={user} onWithdraw={handleWithdrawBid} />
                        })
                      ) : (
                        <motion.tr variants={itemVariants}>
                          <TableCell colSpan={6} className="h-96">
                            <EmptyState
                              icon={Search}
                              title={t('noBidsFound')}
                              description={statusFilter !== 'All' ? t('noBidsStatus', { status: statusFilter }) : t('noBidsYet')}
                              className="border-none shadow-none"
                            />
                            <div className="mt-4 flex justify-center">
                              <Button asChild className="rounded-2xl font-black h-12 px-8"><Link href="/dashboard/jobs">{t('browseOpenJobs')}</Link></Button>
                            </div>
                          </TableCell>
                        </motion.tr>
                      )}
                    </TableBody>
                  </Table>
                </motion.div>
              ) : (
                <motion.div
                  key="grid"
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  variants={containerVariants}
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"
                >
                  {filteredBids.length > 0 ? (
                    filteredBids.map(bid => {
                      const job = jobsById.get(bid.jobId);
                      if (!job || !user) return null;
                      return <MyBidCard key={bid.id || bid.jobId} bid={bid} job={job} user={user} onWithdraw={handleWithdrawBid} />;
                    })
                  ) : (
                    <motion.div variants={itemVariants} className="col-span-full">
                      <EmptyState
                        icon={Search}
                        title={t('noBidsFound')}
                        description={statusFilter !== 'All' ? t('noBidsStatus', { status: statusFilter }) : t('noBidsYet')}
                        className="border-none shadow-none"
                      />
                      <div className="mt-4 flex justify-center">
                        <Button asChild className="rounded-2xl font-black h-12 px-8"><Link href="/dashboard/jobs">{t('browseOpenJobs')}</Link></Button>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
          <CardFooter className="flex-col space-y-4 p-8 border-t border-foreground/5">
            <div className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.2em] w-full text-center">
              {t('showingBids', { count: filteredBids.length, total: bids.length })}
            </div>
            {!loading && hasMore && filteredBids.length > 0 && statusFilter === 'All' && (
              <Button
                variant="outline"
                onClick={() => fetchMyBids(true)}
                disabled={loadMoreLoading}
                className="w-full sm:w-auto min-w-[200px] h-12 rounded-2xl font-black text-xs uppercase tracking-widest"
              >
                {loadMoreLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('loadMore')}
              </Button>
            )}
          </CardFooter>
        </Card>
      </motion.div>
    </motion.div>
  );
}
