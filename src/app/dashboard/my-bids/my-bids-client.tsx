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
import { Award, IndianRupee, ListFilter, X, Loader2, List, Grid, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Job, Bid, User } from "@/lib/types";
import React, { useEffect, useCallback, useMemo } from "react";
import { getStatusVariant, toDate, getMyBidStatus, getRefId } from "@/lib/utils";
import { useUser, useFirebase } from "@/hooks/use-user";
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
import { collection, query, where, getDocs, doc, collectionGroup, getDoc, deleteDoc } from "firebase/firestore";
import { EmptyState } from "@/components/ui/empty-state";
import { Search } from "lucide-react";



import { useTranslations } from "next-intl";



interface BidItemProps {
  bid: Bid & { jobId: string; id: string };
  job: Job;
  user: User;
  onWithdraw: (bidId: string, jobId: string) => void;
}

function MyBidRow({ bid, job, user, onWithdraw }: BidItemProps) {
  const t = useTranslations('myBids');
  const tCommon = useTranslations('common');
  const timeAgo = formatDistanceToNow(toDate(bid.timestamp), { addSuffix: true });
  const myBidStatus = getMyBidStatus(job, user);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const canWithdraw = job.status === 'Open for Bidding';

  const handleDelete = async () => {
    if (!confirm(t('withdrawConfirm'))) return;
    setIsDeleting(true);
    await onWithdraw(bid.id, bid.jobId);
    setIsDeleting(false);
  }

  const pointsEarned = useMemo(() => {
    if (job.status !== 'Completed' || getRefId(job.awardedInstaller) !== user.id || !job.rating) return null;
    const ratingPoints = job.rating === 5 ? 20 : job.rating === 4 ? 10 : 0;
    return 50 + ratingPoints; // 50 for completion
  }, [job, user.id]);

  return (
    <TableRow>
      <TableCell className="font-medium">
        <Link href={`/dashboard/jobs/${bid.jobId}`} className="hover:underline">{job.title}</Link>
        <p className="text-xs text-muted-foreground font-mono">{job.id}</p>
      </TableCell>
      <TableCell>
        {bid.amount > 0 ? (
          <div className="flex items-center gap-1">
            <IndianRupee className="h-4 w-4" />
            {bid.amount.toLocaleString()}
          </div>
        ) : (
          <span className="text-muted-foreground">{t('directAward')}</span>
        )}
      </TableCell>
      <TableCell className="hidden md:table-cell">{timeAgo}</TableCell>
      <TableCell>
        <Badge variant={getStatusVariant(job.status)}>{job.status}</Badge>
      </TableCell>
      <TableCell>
        <Badge variant={myBidStatus.variant}>{myBidStatus.text}</Badge>
      </TableCell>
      <TableCell className="text-right">
        {pointsEarned !== null ? (
          <div className="flex items-center justify-end gap-1 font-semibold text-green-600">
            <Award className="h-4 w-4" />
            +{pointsEarned} {t('pts')}
          </div>
        ) : (
          canWithdraw ? (
            <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
              <span className="ml-1 hidden sm:inline">{t('withdraw')}</span>
            </Button>
          ) : (
            <span className="text-muted-foreground">—</span>
          )
        )}
      </TableCell>
    </TableRow>
  );
}

function MyBidCard({ bid, job, user, onWithdraw }: BidItemProps) {
  const t = useTranslations('myBids');
  const router = useRouter();
  const myBidStatus = getMyBidStatus(job, user);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const canWithdraw = job.status === 'Open for Bidding';

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(t('withdrawConfirm'))) return;
    setIsDeleting(true);
    await onWithdraw(bid.id, bid.jobId);
    setIsDeleting(false);
  }

  return (
    <Card onClick={() => router.push(`/dashboard/jobs/${bid.jobId}`)} className="cursor-pointer relative group">
      {canWithdraw && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700 hover:bg-red-50 z-10"
          onClick={handleDelete}
          disabled={isDeleting}
        >
          {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        </Button>
      )}
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-base leading-tight pr-8 overflow-wrap-anywhere">{job.title}</CardTitle>
          <Badge variant={myBidStatus.variant}>{myBidStatus.text}</Badge>
        </div>
        <CardDescription className="font-mono text-xs pt-1">{job.id}</CardDescription>
      </CardHeader>
      <CardContent className="text-sm space-y-3">
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t('yourBidLabel')}</span>
          <span className="font-semibold flex items-center gap-1"><IndianRupee className="h-4 w-4" />{bid.amount.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t('jobStatus')}</span>
          <Badge variant={getStatusVariant(job.status)}>{job.status}</Badge>
        </div>
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground">
        {t('bidPlacedAgo', { timeAgo: formatDistanceToNow(toDate(bid.timestamp), { addSuffix: true }) })}
      </CardFooter>
    </Card>
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
  const [loading, setLoading] = React.useState(true);
  const [loadMoreLoading, setLoadMoreLoading] = React.useState(false);
  const [hasMore, setHasMore] = React.useState(true);
  const [view, setView] = React.useState<'list' | 'grid'>('list');

  useEffect(() => {
    if (!userLoading && role && role !== 'Installer') {
      router.push('/dashboard');
    }
  }, [role, userLoading, router]);

  const fetchMyBids = useCallback(async (isLoadMore = false) => {
    if (!user || !role || role !== 'Installer') return;

    if (isLoadMore) {
      setLoadMoreLoading(true);
    } else {
      setLoading(true);
    }

    try {
      let lastTimestamp: string | undefined = undefined;
      if (isLoadMore && bids.length > 0) {
        const lastBid = bids[bids.length - 1];
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

      // Update jobs map
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
      console.error("Failed to fetch bids and jobs:", error);
      toast({ title: tCommon('errors.generic'), description: t('withdrawError'), variant: "destructive" });
    } finally {
      if (isLoadMore) {
        setLoadMoreLoading(false);
      } else {
        setLoading(false);
      }
    }
  }, [user, role, toast, t, tCommon, bids]);

  React.useEffect(() => {
    if (!userLoading) {
      fetchMyBids();
    }
  }, [fetchMyBids, userLoading]);

  const handleWithdrawBid = async (bidId: string, jobId: string) => {
    if (!db) return;
    try {
      await deleteDoc(doc(db, "jobs", jobId, "bids", bidId));
      toast({ title: t('bidWithdrawn'), description: t('bidWithdrawnDesc') });
      // Refresh list locally
      setBids(prev => prev.filter(b => b.id !== bidId));
    } catch (error) {
      console.error("Failed to withdraw:", error);
      toast({ title: tCommon('errors.generic'), description: t('withdrawError'), variant: "destructive" });
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
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
    <div className="max-w-full overflow-x-hidden px-4 sm:px-6 grid flex-1 items-start gap-4 sm:gap-6 md:gap-8">
      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <CardTitle className="overflow-wrap-anywhere">{pageTitle}</CardTitle>
            <CardDescription className="overflow-wrap-anywhere">{pageDescription}</CardDescription>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="flex items-center gap-1 rounded-md bg-secondary p-1">
              <Button variant={view === 'list' ? 'secondary' : 'ghost'} size="icon" className="h-9 w-9 min-h-[36px]" onClick={() => setView('list')} aria-label="List view">
                <List className="h-4 w-4" />
              </Button>
              <Button variant={view === 'grid' ? 'secondary' : 'ghost'} size="icon" className="h-9 w-9 min-h-[36px]" onClick={() => setView('grid')} aria-label="Grid view">
                <Grid className="h-4 w-4" />
              </Button>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="default" className="h-10 min-h-[44px] gap-2 flex-1 sm:flex-none">
                  <ListFilter className="h-4 w-4" />
                  <span className="sm:whitespace-nowrap">{tCommon('filter')}</span>
                  {statusFilter !== 'All' && <Badge variant="secondary" className="rounded-full h-6 w-6 p-0 flex items-center justify-center text-xs">1</Badge>}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[calc(100vw-2rem)] sm:w-64">
                <DropdownMenuLabel>{t('filterByStatus')}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup value={statusFilter} onValueChange={handleFilterChange}>
                  {bidStatuses.map(status => (
                    <DropdownMenuRadioItem key={status} value={status} className="min-h-[44px]">{status}</DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            {statusFilter !== 'All' && (
              <Button variant="ghost" size="default" onClick={clearFilters} className="min-h-[44px]">
                <X className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">{t('clear')}</span>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {view === 'list' ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('jobTitle')}</TableHead>
                  <TableHead>{t('yourBid')}</TableHead>
                  <TableHead className="hidden md:table-cell">{t('placed')}</TableHead>
                  <TableHead>{t('jobStatus')}</TableHead>
                  <TableHead>{t('myBidStatus')}</TableHead>
                  <TableHead className="text-right">{t('pointsEarned')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-64 text-center text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin inline-block mr-2" />
                      {tCommon('loading')}
                    </TableCell>
                  </TableRow>
                ) : filteredBids.length > 0 ? (
                  filteredBids.map(bid => {
                    const job = jobsById.get(bid.jobId);
                    if (!job || !user) return null;
                    return <MyBidRow key={bid.id || bid.jobId} bid={bid} job={job} user={user} onWithdraw={handleWithdrawBid} />
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-96">
                      <EmptyState
                        icon={Search}
                        title={t('noBidsFound')}
                        description={
                          statusFilter !== 'All'
                            ? t('noBidsStatus', { status: statusFilter })
                            : t('noBidsYet')
                        }
                        action={
                          <Button asChild>
                            <Link href="/dashboard/jobs">
                              {t('browseOpenJobs')}
                            </Link>
                          </Button>
                        }
                        className="border-0 shadow-none min-h-[300px]"
                      />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {loading ? (
                <div className="col-span-full text-center py-10"><Loader2 className="h-8 w-8 animate-spin" /></div>
              ) : filteredBids.length > 0 ? (
                filteredBids.map(bid => {
                  const job = jobsById.get(bid.jobId);
                  if (!job || !user) return null;
                  return <MyBidCard key={bid.id || bid.jobId} bid={bid} job={job} user={user} onWithdraw={handleWithdrawBid} />;
                })
              ) : (
                <div className="col-span-full">
                  <EmptyState
                    icon={Search}
                    title={t('noBidsFound')}
                    description={
                      statusFilter !== 'All'
                        ? t('noBidsStatus', { status: statusFilter })
                        : t('noBidsYet')
                    }
                    action={
                      <Button asChild>
                        <Link href="/dashboard/jobs">
                          {t('browseOpenJobs')}
                        </Link>
                      </Button>
                    }
                  />
                </div>
              )}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex-col space-y-4 pt-6">
          <div className="text-xs text-muted-foreground w-full text-center">
            {t('showingBids', { count: filteredBids.length, total: bids.length })}
          </div>
          {!loading && hasMore && filteredBids.length > 0 && statusFilter === 'All' && (
            <Button
              variant="outline"
              onClick={() => fetchMyBids(true)}
              disabled={loadMoreLoading}
              className="w-full sm:w-auto min-w-[200px]"
            >
              {loadMoreLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('loadMore')}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
