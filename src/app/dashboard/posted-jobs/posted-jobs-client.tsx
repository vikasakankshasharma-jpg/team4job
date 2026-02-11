
"use client";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Loader2, RefreshCw, Star, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  TooltipProvider,
} from "@/components/ui/tooltip"
import { useSearchParams, useRouter } from "next/navigation";
import { Job } from "@/lib/types";
import { toDate, getRefId } from "@/lib/utils";
import { useUser, useFirebase } from "@/hooks/use-user";
import { useState, useEffect } from "react";
import { useHelp } from "@/hooks/use-help";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Briefcase, Archive, Inbox } from "lucide-react";
import { StatusBadge } from "@/components/job-giver/status-badge";
import { EnhancedEmptyState } from "@/components/job-giver/enhanced-empty-state";
import { BulkActionsToolbar } from "@/components/posted-jobs/bulk-actions-toolbar";
import { AdvancedFilters, type JobFilters } from "@/components/posted-jobs/advanced-filters";
import { MobileJobCard } from "@/components/posted-jobs/mobile-job-card";
import { useMyJobs } from "@/hooks/use-my-jobs";
import { useTranslations } from 'next-intl';

function PromoteJobDialog({ job, onJobPromoted }: { job: Job, onJobPromoted: () => void }) {
  const { user } = useUser();
  const { auth } = useFirebase();
  const { toast } = useToast();
  const tJob = useTranslations('job');
  const tCommon = useTranslations('common');

  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [tip, setTip] = useState(0);
  const [newDeadline, setNewDeadline] = useState('');

  const handlePromote = async () => {
    if (!tip || tip <= 0 || !newDeadline) {
      toast({
        title: tJob('invalidInput'),
        description: tJob('invalidInputDesc'),
        variant: "destructive"
      });
      return;
    }

    if (!user) return;

    setIsLoading(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Not authenticated");
      const response = await fetch(`/api/jobs/${job.id}/promote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ travelTip: tip, deadline: newDeadline })
      });

      if (!response.ok) throw new Error('Failed to promote job');

      toast({
        title: tJob('jobPromoted'),
        description: tJob('jobPromotedDesc'),
        variant: "default"
      });
      onJobPromoted();
      setIsOpen(false);
    } catch (error) {
      console.error("Error promoting job:", error);
      toast({
        title: tCommon('error'),
        description: tJob('promoteFailed'),
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-primary focus:bg-primary/10 focus:text-primary">
          <Star className="mr-2 h-4 w-4" />
          {tJob('promoteAndRelist')}
        </DropdownMenuItem>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{tJob('promoteUnbidJob')}</DialogTitle>
          <DialogDescription>
            {tJob('promoteUnbidJobDesc')}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="tip-amount">{tJob('travelTipAmount')}</Label>
            <Input
              id="tip-amount"
              type="number"
              placeholder="e.g., 500"
              value={tip}
              onChange={(e) => setTip(Number(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">{tJob('travelTipHelp')}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-deadline">{tJob('newBiddingDeadline')}</Label>
            <Input
              id="new-deadline"
              type="date"
              value={newDeadline}
              onChange={(e) => setNewDeadline(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={isLoading}>{tCommon('cancel')}</Button>
          </DialogClose>
          <Button onClick={handlePromote} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {tJob('promoteAndRelistJob')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function PostedJobsTable({ jobs, title, description, footerText, loading, onUpdate }: { jobs: Job[], title: string, description: string, footerText: string, loading: boolean, onUpdate: () => void }) {
  const tJob = useTranslations('job');
  const tCommon = useTranslations('common');

  const getJobType = (job: Job) => {
    if (!job.awardedInstaller) return 'N/A';

    const awardedInstallerId = getRefId(job.awardedInstaller);

    if (!job.bids || job.bids.length === 0) {
      if (awardedInstallerId) return tJob('jobTypeDirect');
      return 'N/A';
    }

    const bidderIds = (job.bids || []).map(b => getRefId(b.installer));

    return bidderIds.includes(awardedInstallerId) ? tJob('jobTypeBidding') : tJob('jobTypeDirect');
  };

  const getActionsForJob = (job: Job) => {
    const actions = [
      <DropdownMenuItem key="view" asChild><Link href={`/dashboard/jobs/${job.id}`}>{tJob('viewDetails')}</Link></DropdownMenuItem>
    ];

    if (job.status === 'Unbid' || job.status === 'Cancelled') {
      actions.push(<DropdownMenuItem key="repost" asChild><Link href={`/dashboard/post-job?repostJobId=${job.id}`}><RefreshCw className="mr-2 h-4 w-4" />{tJob('repostJob')}</Link></DropdownMenuItem>);
    }

    if (job.status === 'Unbid') {
      actions.push(<PromoteJobDialog key="promote" job={job} onJobPromoted={onUpdate} />);
    }

    return actions;
  }

  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Desktop: Table */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{tJob('title')}</TableHead>
                  <TableHead>{tCommon('status')}</TableHead>
                  <TableHead className="hidden md:table-cell">{tJob('bids')}</TableHead>
                  <TableHead className="hidden md:table-cell">{tCommon('type')}</TableHead>
                  <TableHead className="hidden md:table-cell">{tJob('postedOn')}</TableHead>
                  <TableHead>
                    <span className="sr-only">{tCommon('actions')}</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center h-24">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                      <span className="sr-only">{tCommon('loading')}</span>
                    </TableCell>
                  </TableRow>
                ) : jobs.length > 0 ? jobs.map(job => (
                  <TableRow key={job.id}>
                    <TableCell className="font-medium">
                      <Link href={`/dashboard/jobs/${job.id}`} className="hover:underline">{job.title}</Link>
                      <p className="text-xs text-muted-foreground font-mono">{job.id}</p>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={job.status} showTooltip={false} size="sm" />
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{(job.bids || []).length}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      {getJobType(job)}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{format(toDate(job.postedAt), "MMM d, yyyy")}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button aria-haspopup="true" size="icon" variant="ghost">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">{tCommon('toggleMenu')}</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>{tCommon('actions')}</DropdownMenuLabel>
                          {getActionsForJob(job)}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-64 p-8">
                      <EnhancedEmptyState
                        icon={title.toLowerCase().includes('archived') ? Archive : title.toLowerCase().includes('unbid') ? Inbox : Briefcase}
                        title={
                          title.toLowerCase().includes('active') ? tJob('noActiveJobs') :
                            title.toLowerCase().includes('unbid') ? tJob('noUnbidJobs') :
                              tJob('noArchivedJobs')
                        }
                        description={
                          title.toLowerCase().includes('active')
                            ? tJob('noActiveJobsDesc')
                            : title.toLowerCase().includes('unbid')
                              ? tJob('noUnbidJobsDesc')
                              : tJob('noArchivedJobsDesc')
                        }
                        action={
                          title.toLowerCase().includes('active') ? {
                            label: tJob('postFirstJob'),
                            onClick: () => window.location.href = '/dashboard/post-job',
                            variant: 'default' as const
                          } : undefined
                        }
                        className="border-0 shadow-none"
                      />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile: Cards */}
          <div className="md:hidden space-y-4">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : jobs.length > 0 ? (
              jobs.map(job => (
                <MobileJobCard key={job.id} job={job} />
              ))
            ) : (
              <EnhancedEmptyState
                icon={Briefcase}
                title={
                  title.toLowerCase().includes('active') ? tJob('noActiveJobs') :
                    title.toLowerCase().includes('unbid') ? tJob('noUnbidJobs') :
                      tJob('noArchivedJobs')
                }
                description={
                  title.toLowerCase().includes('active')
                    ? tJob('noActiveJobsDesc')
                    : tJob('noUnbidJobsDesc')
                }
                action={title.toLowerCase().includes('active') ? { label: tJob('postNewJob'), onClick: () => window.location.href = '/dashboard/post-job' } : undefined}
                className="border-0 shadow-none"
              />
            )}
          </div>
        </CardContent>
        <CardFooter>
          <div className="text-xs text-muted-foreground">
            {footerText}
          </div>
        </CardFooter>
      </Card>
    </TooltipProvider >
  )
}

export default function PostedJobsClient({ initialJobs }: { initialJobs?: Job[] }) {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") || "active";
  const { user, role, loading: userLoading } = useUser();
  const { auth } = useFirebase();
  const router = useRouter();
  const { setHelp } = useHelp();
  const { toast } = useToast();
  const tJob = useTranslations('job');
  const tCommon = useTranslations('common');

  const { jobs, loading: jobsLoading, refetch, loadMore, hasMore, loadMoreLoading } = useMyJobs(initialJobs);

  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);
  const [filters, setFilters] = useState<JobFilters>({});

  useEffect(() => {
    if (!userLoading && user && (user.roles.includes('Admin') || role === 'Installer')) {
      router.push('/dashboard');
    }
  }, [user, userLoading, router, role]);

  useEffect(() => {
    setHelp({
      title: tJob('guideTitle'),
      content: (
        <div className="space-y-4 text-sm">
          <p>{tJob('guidePart1')}</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <span className="font-semibold">{tCommon('active')}:</span> {tJob('guideActive')}
            </li>
            <li>
              <span className="font-semibold">Unbid:</span> {tJob('guideUnbid')}
            </li>
            <li>
              <span className="font-semibold">{tCommon('archived')}:</span> {tJob('guideArchived')}
            </li>
            <li>
              <span className="font-semibold">{tCommon('type')}:</span> {tJob('guideType')}
            </li>
            <li>
              <span className="font-semibold">{tCommon('actions')}:</span> {tJob('guideActions')}
            </li>
          </ul>
          <p>
            {tJob('guideFooter')}
          </p>
        </div>
      )
    });
  }, [setHelp, tJob, tCommon]);

  const handleBulkAction = async (action: 'archive' | 'delete') => {
    if (selectedJobIds.length === 0 || !user) return;

    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Not authenticated");

      const response = await fetch('/api/jobs/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action, jobIds: selectedJobIds })
      });

      if (!response.ok) throw new Error(`Failed to ${action} jobs`);

      toast({
        title: tCommon('success'),
        description: tCommon('bulkActionSuccess', { count: selectedJobIds.length, action })
      });
      setSelectedJobIds([]);
      refetch();
    } catch (error) {
      console.error(`Bulk ${action} error:`, error);
      toast({
        title: tCommon('error'),
        description: tCommon('bulkActionError', { action }),
        variant: "destructive"
      });
    }
  };

  const handleBulkArchive = () => handleBulkAction('archive');
  const handleBulkDelete = () => handleBulkAction('delete');

  // Filter logic
  const applyFilters = (jobsList: Job[]) => {
    return jobsList.filter(job => {
      // Search filter
      if (filters.search && !job.title.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }

      // Budget filters - use priceEstimate if available
      if (filters.budgetMin || filters.budgetMax) {
        const jobBudget = job.priceEstimate?.max || job.priceEstimate?.min || 0;
        if (filters.budgetMin && jobBudget < filters.budgetMin) return false;
        if (filters.budgetMax && jobBudget > filters.budgetMax) return false;
      }

      // Category filter
      if (filters.category && job.jobCategory !== filters.category) return false;

      // Date filters
      if (filters.dateFrom) {
        const jobDate = toDate(job.postedAt);
        const fromDate = new Date(filters.dateFrom);
        if (jobDate < fromDate) return false;
      }
      if (filters.dateTo) {
        const jobDate = toDate(job.postedAt);
        const toDateFilter = new Date(filters.dateTo);
        if (jobDate > toDateFilter) return false;
      }

      // Installer filter
      if (filters.installer) {
        const awardedInstallerName = typeof job.awardedInstaller === 'object' && 'name' in job.awardedInstaller ? job.awardedInstaller.name : '';
        if (!awardedInstallerName || !awardedInstallerName.toLowerCase().includes(filters.installer.toLowerCase())) {
          return false;
        }
      }

      return true;
    });
  };

  if (userLoading || (!userLoading && role !== 'Job Giver')) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  // Use jobs from hook
  const activeJobs = applyFilters(jobs.filter(job => !['completed', 'cancelled', 'unbid'].includes(job.status.toLowerCase()))).sort((a, b) => toDate(b.postedAt).getTime() - toDate(a.postedAt).getTime());

  const unbidJobs = applyFilters(jobs.filter(job => job.status.toLowerCase() === 'unbid')).sort((a, b) => toDate(b.postedAt).getTime() - toDate(a.postedAt).getTime());
  const archivedJobs = applyFilters(jobs.filter(job => ['completed', 'cancelled'].includes(job.status.toLowerCase()))).sort((a, b) => toDate(b.postedAt).getTime() - toDate(a.postedAt).getTime());

  // Get categories for filter dropdown
  const categories = Array.from(new Set(jobs.map(j => j.jobCategory).filter(Boolean)));

  const showLoadMore = hasMore && !filters.search && !filters.category && !filters.dateFrom && !filters.dateTo && !filters.budgetMin && !filters.budgetMax;

  return (
    <>
      <Tabs defaultValue={tab} className="w-full">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
          <TabsList className="h-auto flex-wrap justify-start w-full sm:w-auto grid-cols-1 sm:grid-cols-3">
            <TabsTrigger value="active" className="flex-1 sm:flex-none">{tCommon('active')} ({activeJobs.length})</TabsTrigger>
            <TabsTrigger value="unbid" className="flex-1 sm:flex-none">{tCommon('unbid')} ({unbidJobs.length})</TabsTrigger>
            <TabsTrigger value="archived" className="flex-1 sm:flex-none">{tCommon('archived')} ({archivedJobs.length})</TabsTrigger>
          </TabsList>
          <Button asChild>
            <Link href="/dashboard/post-job">
              <PlusCircle className="mr-2 h-4 w-4" />
              {tJob('postNewJob')}
            </Link>
          </Button>
        </div>

        {/* Advanced Filters */}
        <div className="mb-4">
          <AdvancedFilters
            onFilterChange={setFilters}
            appliedFilters={filters}
            categories={categories}
          />
        </div>

        <TabsContent value="active" className="space-y-4">
          <PostedJobsTable
            jobs={activeJobs}
            title={tJob('myActiveJobs')}
            description={tJob('activeJobsDesc')}
            footerText={tJob('activeJobsFooter', { count: activeJobs.length })}
            loading={jobsLoading}
            onUpdate={refetch}
          />
          {showLoadMore && (
            <div className="flex justify-center mt-8 pb-4">
              <Button
                variant="outline"
                onClick={loadMore}
                disabled={loadMoreLoading}
                className="w-full sm:w-auto min-w-[200px]"
              >
                {loadMoreLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {tCommon('loadMore')}
              </Button>
            </div>
          )}
        </TabsContent>
        <TabsContent value="unbid" className="space-y-4">
          <PostedJobsTable
            jobs={unbidJobs}
            title={tJob('unbidJobs')}
            description={tJob('unbidJobsDesc')}
            footerText={tJob('unbidJobsFooter', { count: unbidJobs.length })}
            loading={jobsLoading}
            onUpdate={refetch}
          />
          {showLoadMore && (
            <div className="flex justify-center mt-8 pb-4">
              <Button
                variant="outline"
                onClick={loadMore}
                disabled={loadMoreLoading}
                className="w-full sm:w-auto min-w-[200px]"
              >
                {loadMoreLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {tCommon('loadMore')}
              </Button>
            </div>
          )}
        </TabsContent>
        <TabsContent value="archived" className="space-y-4">
          <PostedJobsTable
            jobs={archivedJobs}
            title={tJob('myArchivedJobs')}
            description={tJob('archivedJobsDesc')}
            footerText={tJob('archivedJobsFooter', { count: archivedJobs.length })}
            loading={jobsLoading}
            onUpdate={refetch}
          />
          {showLoadMore && (
            <div className="flex justify-center">
              <Button variant="outline" onClick={loadMore} disabled={loadMoreLoading}>
                {loadMoreLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {tCommon('loadMore')}
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Bulk Actions Toolbar */}
      <BulkActionsToolbar
        selectedCount={selectedJobIds.length}
        onArchive={handleBulkArchive}
        onDelete={handleBulkDelete}
        onClearSelection={() => setSelectedJobIds([])}
      />
    </>
  )
}
