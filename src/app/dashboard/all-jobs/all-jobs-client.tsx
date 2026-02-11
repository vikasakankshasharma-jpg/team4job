
"use client";

import React from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { Calendar as CalendarIcon, X, ArrowUpDown, Loader2, Download, List, Grid, Briefcase, Clock, CheckCircle, AlertTriangle, FileText, Inbox } from "lucide-react";
import { StatCard, FilterBar, ExportButton, AdminEmptyState } from "@/components/admin";
import type { Filter } from "@/components/admin";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Job, User } from "@/lib/types";
import { getStatusVariant, toDate, cn, exportToCsv } from "@/lib/utils";
import { useUser, useFirebase } from "@/hooks/use-user";
import Link from "next/link";
import { collection, getDocs, query, DocumentReference, getDoc, where, doc, limit, startAfter, orderBy, QueryDocumentSnapshot, DocumentData, Timestamp } from "firebase/firestore";
import { useHelp } from "@/hooks/use-help";
import { JobListSkeleton } from "@/components/skeletons/job-list-skeleton";
import { GlobalErrorBoundary } from "@/components/dashboard/error-boundary";
import { useTranslations } from "next-intl";

const initialFilters = {
  jobId: "",
  pincode: "",
  status: "all",
  jobType: "all",
  jobGiver: "",
  date: undefined as DateRange | undefined,
};

type SortableKeys = 'title' | 'status' | 'jobGiver' | 'bids' | 'jobType' | 'postedAt';

function getJobType(job: Job) {
  if (!job.awardedInstaller) return 'N/A';

  const awardedInstallerId = (job.awardedInstaller as DocumentReference)?.id || (job.awardedInstaller as User)?.id;

  if (!job.bids || job.bids.length === 0) {
    // If there are no bids but an installer is awarded, it's a Direct award.
    return awardedInstallerId ? 'Direct' : 'N/A';
  }

  const bidderIds = (job.bids || []).map(b => (b.installer as DocumentReference)?.id || (b.installer as User)?.id);

  return bidderIds.includes(awardedInstallerId as string) ? 'Bidding' : 'Direct';
};

const getRefId = (ref: any): string | null => {
  if (!ref) return null;
  if (typeof ref === 'string') return ref;
  return ref.id || null;
}

function JobCard({ job, onRowClick, t }: { job: Job, onRowClick: (jobId: string) => void, t: any }) {
  const jobGiverName = (job.jobGiver as User)?.name || 'N/A';

  return (
    <Card onClick={() => onRowClick(job.id)} className="cursor-pointer">
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-base leading-tight pr-4">{job.title}</CardTitle>
          <Badge variant={getStatusVariant(job.status)}>{job.status}</Badge>
        </div>
        <CardDescription className="font-mono text-xs pt-1">{job.id}</CardDescription>
      </CardHeader>
      <CardContent className="text-sm space-y-3">
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t('table.giver')}</span>
          <span className="font-medium">{jobGiverName}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t('table.bids')}</span>
          <span className="font-medium">{(job.bids || []).length}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t('table.type')}</span>
          <span className="font-medium">{getJobType(job)}</span>
        </div>
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground">
        {t('table.posted')} {format(toDate(job.postedAt), 'MMM d, yyyy')}
      </CardFooter>
    </Card>
  )
}

export default function AllJobsClient() {
  const router = useRouter();
  const t = useTranslations('admin.allJobs');
  const { user, isAdmin, loading: userLoading } = useUser();
  const { db } = useFirebase();
  const queryClient = useQueryClient();
  const [filters, setFilters] = React.useState(initialFilters);
  const [allStatuses, setAllStatuses] = React.useState<string[]>([]);
  const [sortConfig, setSortConfig] = React.useState<{ key: SortableKeys; direction: 'ascending' | 'descending' } | null>({ key: 'postedAt', direction: 'descending' });
  const { setHelp } = useHelp();
  const [view, setView] = React.useState<'list' | 'grid'>('list');
  const [activeTab, setActiveTab] = React.useState<string>('all');
  const [pageSize] = React.useState(25);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status
  } = useInfiniteQuery({
    queryKey: ['jobs', isAdmin],
    queryFn: async ({ pageParam }) => {
      if (!db || !isAdmin) return { jobs: [], lastDoc: null };

      const jobsCollection = collection(db, 'jobs');
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      let q = query(
        jobsCollection,
        where('postedAt', '>=', Timestamp.fromDate(thirtyDaysAgo)),
        orderBy('postedAt', 'desc'),
        limit(pageSize)
      );

      if (pageParam) {
        q = query(q, startAfter(pageParam));
      }

      const jobSnapshot = await getDocs(q);
      const jobList = jobSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Job);

      // Fetch related users logic
      const userRefs = new Map<string, DocumentReference>();
      jobList.forEach(job => {
        const jobGiverId = getRefId(job.jobGiver);
        if (jobGiverId) userRefs.set(jobGiverId, doc(db, 'users', jobGiverId));

        const awardedInstallerId = getRefId(job.awardedInstaller);
        if (awardedInstallerId) userRefs.set(awardedInstallerId, doc(db, 'users', awardedInstallerId));

        (job.bids || []).forEach(bid => {
          const installerId = getRefId(bid.installer);
          if (installerId) userRefs.set(installerId, doc(db, 'users', installerId));
        });
      });

      const usersMap = new Map<string, User>();
      const userIds = Array.from(userRefs.keys());

      if (userIds.length > 0) {
        for (let i = 0; i < userIds.length; i += 30) {
          const chunk = userIds.slice(i, i + 30);
          if (chunk.length > 0) {
            const usersQuery = query(collection(db, 'users'), where('__name__', 'in', chunk));
            const userDocs = await getDocs(usersQuery);
            userDocs.forEach(docSnap => {
              if (docSnap.exists()) {
                usersMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() } as User);
              }
            });
          }
        }
      }

      const populatedJobs = jobList.map(job => {
        const jobGiverId = getRefId(job.jobGiver);
        const awardedInstallerId = getRefId(job.awardedInstaller);
        return {
          ...job,
          jobGiver: jobGiverId ? usersMap.get(jobGiverId) || job.jobGiver : job.jobGiver,
          awardedInstaller: awardedInstallerId ? usersMap.get(awardedInstallerId) || job.awardedInstaller : undefined,
          bids: (job.bids || []).map(bid => {
            const installerId = getRefId(bid.installer);
            return {
              ...bid,
              installer: installerId ? usersMap.get(installerId) || bid.installer : bid.installer,
            }
          }),
        };
      });

      const lastDoc = jobSnapshot.docs[jobSnapshot.docs.length - 1];
      return { jobs: populatedJobs, lastDoc };
    },
    initialPageParam: null as QueryDocumentSnapshot<DocumentData> | null,
    getNextPageParam: (lastPage) => lastPage.lastDoc || null,
    enabled: !!db && !!isAdmin,
  });

  const jobs = React.useMemo(() => data?.pages.flatMap(p => p.jobs) || [], [data]);
  const loading = status === 'pending';
  const loadingMore = isFetchingNextPage;
  const hasMore = hasNextPage;

  React.useEffect(() => {
    // Populate filter options based on loaded jobs
    if (jobs.length > 0) {
      const uniqueStatuses = Array.from(new Set(jobs.map(j => j.status)));
      setAllStatuses(['all', ...uniqueStatuses.sort()]);
    }
  }, [jobs]);

  React.useEffect(() => {
    setHelp({
      title: t('help.title'),
      content: (
        <div className="space-y-4 text-sm">
          <p>{t('help.intro')}</p>
          <ul className="list-disc space-y-2 pl-5">
            <li><span className="font-semibold">{t('help.filters')}</span> {t('help.filtersDesc')}</li>
            <li><span className="font-semibold">{t('help.sort')}</span> {t('help.sortDesc')}</li>
            <li><span className="font-semibold">{t('help.export')}</span> {t('help.exportDesc')}</li>
            <li><span className="font-semibold">{t('help.details')}</span> {t('help.detailsDesc')}</li>
          </ul>
        </div>
      )
    })
  }, [setHelp, t]);

  React.useEffect(() => {
    if (!userLoading && !isAdmin) {
      router.push('/dashboard');
    }
  }, [user, isAdmin, router, userLoading]);




  const handleFilterChange = (filterName: keyof typeof filters, value: any) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };

  const requestSort = (key: SortableKeys) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };


  const filteredAndSortedJobs = React.useMemo(() => {
    let filtered = jobs;

    if (filters.jobId) {
      filtered = filtered.filter(job => job.title.toLowerCase().includes(filters.jobId.toLowerCase()));
    }
    if (filters.pincode) {
      filtered = filtered.filter(job => job.location.toLowerCase().includes(filters.pincode.toLowerCase()));
    }
    if (filters.status !== 'all') {
      filtered = filtered.filter(job => job.status === filters.status);
    }
    if (filters.jobGiver) {
      const giverFilter = filters.jobGiver.toLowerCase();
      filtered = filtered.filter(job => {
        const jobGiverName = (job.jobGiver as User)?.name || '';
        return jobGiverName.toLowerCase().includes(giverFilter);
      });
    }
    if (filters.jobType !== 'all') {
      filtered = filtered.filter(job => getJobType(job) === filters.jobType);
    }
    if (filters.date?.from) {
      const to = filters.date.to || filters.date.from; // If only one day is selected, use it as range
      filtered = filtered.filter(job => {
        const postedDate = toDate(job.postedAt);
        return postedDate >= filters.date!.from! && postedDate <= to;
      });
    }

    if (sortConfig !== null) {
      filtered.sort((a, b) => {
        let valA, valB;
        switch (sortConfig.key) {
          case 'title':
            valA = a.title.toLowerCase();
            valB = b.title.toLowerCase();
            break;
          case 'status':
            valA = a.status.toLowerCase();
            valB = b.status.toLowerCase();
            break;
          case 'jobGiver':
            valA = (a.jobGiver as User)?.name || '';
            valB = (b.jobGiver as User)?.name || '';
            break;
          case 'bids':
            valA = (a.bids || []).length;
            valB = (b.bids || []).length;
            break;
          case 'jobType':
            valA = getJobType(a).toLowerCase();
            valB = getJobType(b).toLowerCase();
            break;
          case 'postedAt':
            valA = toDate(a.postedAt).getTime();
            valB = toDate(b.postedAt).getTime();
            break;
          default:
            return 0;
        }

        if (valA < valB) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (valA > valB) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }

    return filtered;
  }, [jobs, filters, sortConfig]);

  // Stats calculations  
  const stats = React.useMemo(() => {
    const totalJobs = jobs.length;
    const activeJobs = jobs.filter(j => j.status === 'Open for Bidding' || j.status === 'Bidding Closed' || j.status === 'Awarded' || j.status === 'In Progress').length;
    const completedJobs = jobs.filter(j => j.status === 'Completed').length;
    const disputedJobs = jobs.filter(j => j.status === 'Disputed').length;
    const biddingJobs = jobs.filter(j => getJobType(j) === 'Bidding').length;
    const directJobs = jobs.filter(j => getJobType(j) === 'Direct').length;

    return {
      totalJobs,
      activeJobs,
      completedJobs,
      disputedJobs,
      biddingJobs,
      directJobs,
    };
  }, [jobs]);

  // Export data
  const exportData = filteredAndSortedJobs.map(job => ({
    ID: job.id,
    Title: job.title,
    Status: job.status,
    'Job Giver': (job.jobGiver as User)?.name || 'N/A',
    Bids: (job.bids || []).length,
    'Job Type': getJobType(job),
    'Posted Date': format(toDate(job.postedAt), 'yyyy-MM-dd'),
    Location: job.location,
  }));

  // Tab-based filtering
  const tabFilteredJobs = React.useMemo(() => {
    switch (activeTab) {
      case 'active':
        return filteredAndSortedJobs.filter(j => j.status === 'Open for Bidding' || j.status === 'Bidding Closed' || j.status === 'Awarded' || j.status === 'In Progress');
      case 'completed':
        return filteredAndSortedJobs.filter(j => j.status === 'Completed');
      case 'disputed':
        return filteredAndSortedJobs.filter(j => j.status === 'Disputed');
      default:
        return filteredAndSortedJobs;
    }
  }, [filteredAndSortedJobs, activeTab]);


  if (userLoading || !isAdmin) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const handleRowClick = (jobId: string) => {
    router.push(`/dashboard/jobs/${jobId}`);
  };

  const clearFilters = () => {
    setFilters(initialFilters);
  }

  const activeFiltersCount = Object.values(filters).filter(value =>
    value !== "" && value !== "all" && value !== undefined
  ).length;

  const jobTypes = ["all", "Bidding", "Direct"];

  const getSortIcon = (key: SortableKeys) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />;
    }
    return sortConfig.direction === 'ascending' ? '▲' : '▼';
  };

  // FilterBar configuration
  const filterConfig: Filter[] = [
    {
      id: 'jobId',
      label: t('filters.jobIdLabel'),
      type: 'search',
      placeholder: t('filters.jobIdPlaceholder'),
      value: filters.jobId,
      onChange: (value) => handleFilterChange('jobId', value),
    },
    {
      id: 'status',
      label: t('filters.statusLabel'),
      type: 'select',
      options: allStatuses.map(s => ({ label: s === 'all' ? t('filters.allStatuses') : s, value: s })),
      value: filters.status,
      onChange: (value) => handleFilterChange('status', value),
    },
    {
      id: 'jobType',
      label: t('filters.typeLabel'),
      type: 'select',
      options: jobTypes.map(type => ({ label: type === 'all' ? t('filters.allTypes') : type, value: type })),
      value: filters.jobType,
      onChange: (value) => handleFilterChange('jobType', value),
    },
  ];

  return (
    <GlobalErrorBoundary>
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard
          title={t('stats.total')}
          value={stats.totalJobs}
          icon={Briefcase}
          description={t('stats.totalDesc')}
        />
        <StatCard
          title={t('stats.active')}
          value={stats.activeJobs}
          icon={Clock}
          description={t('stats.activeDesc')}
        />
        <StatCard
          title={t('stats.completed')}
          value={stats.completedJobs}
          icon={CheckCircle}
          description={t('stats.completedDesc')}
        />
        <StatCard
          title={t('stats.disputed')}
          value={stats.disputedJobs}
          icon={AlertTriangle}
          description={t('stats.disputedDesc')}
        />
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>{t('title')}</CardTitle>
              <CardDescription>
                {t('description', { count: filteredAndSortedJobs.length, bidding: stats.biddingJobs, direct: stats.directJobs })}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 rounded-md bg-secondary p-1">
                <Button variant={view === 'list' ? 'secondary' : 'ghost'} size="icon" className="h-7 w-7" onClick={() => setView('list')}>
                  <List className="h-4 w-4" />
                </Button>
                <Button variant={view === 'grid' ? 'secondary' : 'ghost'} size="icon" className="h-7 w-7" onClick={() => setView('grid')}>
                  <Grid className="h-4 w-4" />
                </Button>
              </div>
              <ExportButton
                data={exportData}
                filename={`jobs-${new Date().toISOString().split('T')[0]}`}
                formats={['csv', 'json']}
                label={t('buttons.export')}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <JobListSkeleton />
          ) : (
            <>
              {/* Tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
                <TabsList>
                  <TabsTrigger value="all">{t('tabs.all')} ({filteredAndSortedJobs.length})</TabsTrigger>
                  <TabsTrigger value="active">{t('tabs.active')} ({filteredAndSortedJobs.filter(j => j.status === 'Open for Bidding' || j.status === 'In Progress').length})</TabsTrigger>
                  <TabsTrigger value="completed">{t('tabs.completed')} ({stats.completedJobs})</TabsTrigger>
                  <TabsTrigger value="disputed">{t('tabs.disputed')} ({stats.disputedJobs})</TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Filters */}
              <div className="mb-4">
                <FilterBar filters={filterConfig} onReset={clearFilters} resetLabel={t('buttons.reset')} />
              </div>

              {/* List View */}
              {view === 'list' && (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>
                        <Button variant="ghost" onClick={() => requestSort('title')}>
                          {t('table.title')}
                          {getSortIcon('title')}
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button variant="ghost" onClick={() => requestSort('status')}>
                          {t('table.status')}
                          {getSortIcon('status')}
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button variant="ghost" onClick={() => requestSort('jobGiver')}>
                          {t('table.giver')}
                          {getSortIcon('jobGiver')}
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button variant="ghost" onClick={() => requestSort('bids')}>
                          {t('table.bids')}
                          {getSortIcon('bids')}
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button variant="ghost" onClick={() => requestSort('jobType')}>
                          {t('table.type')}
                          {getSortIcon('jobType')}
                        </Button>
                      </TableHead>
                      <TableHead className="text-right">
                        <Button variant="ghost" onClick={() => requestSort('postedAt')}>
                          {t('table.posted')}
                          {getSortIcon('postedAt')}
                        </Button>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                          <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                        </TableCell>
                      </TableRow>
                    ) : tabFilteredJobs.length > 0 ? (
                      tabFilteredJobs.map((job) => (
                        <TableRow key={job.id} onClick={() => handleRowClick(job.id)} className="cursor-pointer">
                          <TableCell>
                            <p className="font-medium">{job.title}</p>
                            <p className="text-xs text-muted-foreground font-mono">{job.id}</p>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusVariant(job.status)}>{job.status}</Badge>
                          </TableCell>
                          <TableCell>
                            <Link href={`/dashboard/users/${(job.jobGiver as User).id}`} className="hover:underline" onClick={e => e.stopPropagation()}>
                              {(job.jobGiver as User).name}
                            </Link>
                          </TableCell>
                          <TableCell>
                            {(job.bids || []).length}
                          </TableCell>
                          <TableCell>
                            {getJobType(job)}
                          </TableCell>
                          <TableCell className="text-right">
                            {format(toDate(job.postedAt), 'MMM d, yyyy')}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24">
                          <AdminEmptyState
                            icon={Inbox}
                            title={t('empty.noJobs')}
                            description={t('empty.tryAdjusting')}
                            action={{
                              label: t('buttons.reset'),
                              onClick: clearFilters,
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}

              {/* Grid View */}
              {view === 'grid' && (
                <div>
                  {loading ? (
                    <AdminEmptyState
                      icon={Clock}
                      title={t('empty.loading')}
                      description={t('empty.wait')}
                    />
                  ) : tabFilteredJobs.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {tabFilteredJobs.map((job) => (
                        <JobCard key={job.id} job={job} onRowClick={handleRowClick} t={t} />
                      ))}
                    </div>
                  ) : (
                    <AdminEmptyState
                      icon={Inbox}
                      title={t('empty.noJobs')}
                      description={t('empty.tryAdjusting')}
                      action={{
                        label: t('buttons.reset'),
                        onClick: clearFilters,
                      }}
                    />
                  )}
                </div>
              )}

              {/* Load More Button */}
              {!loading && hasMore && tabFilteredJobs.length > 0 && (
                <div className="flex justify-center mt-6">
                  <Button
                    onClick={() => fetchNextPage()}
                    disabled={loadingMore}
                    variant="outline"
                    size="lg"
                  >
                    {loadingMore ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t('buttons.loadingMore')}
                      </>
                    ) : (
                      `${t('buttons.loadMore')} (${jobs.length})`
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </GlobalErrorBoundary>
  );
}


