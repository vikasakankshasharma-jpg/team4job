
"use client";

import React from "react";
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
import { Calendar as CalendarIcon, X, ArrowUpDown, Loader2, Download, List, Grid } from "lucide-react";
import { Job, User } from "@/lib/types";
import { getStatusVariant, toDate, cn, exportToCsv } from "@/lib/utils";
import { useUser, useFirebase } from "@/hooks/use-user";
import Link from "next/link";
import { collection, getDocs, query, DocumentReference, getDoc, where, doc } from "firebase/firestore";
import { useHelp } from "@/hooks/use-help";

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

function JobCard({ job, onRowClick }: { job: Job, onRowClick: (jobId: string) => void }) {
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
          <span className="text-muted-foreground">Job Giver</span>
          <span className="font-medium">{jobGiverName}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Bids</span>
          <span className="font-medium">{(job.bids || []).length}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Job Type</span>
          <span className="font-medium">{getJobType(job)}</span>
        </div>
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground">
        Posted on {format(toDate(job.postedAt), 'MMM d, yyyy')}
      </CardFooter>
    </Card>
  )
}

export default function AllJobsClient() {
  const router = useRouter();
  // ... rest of component
  const { user, isAdmin, loading: userLoading } = useUser();
  const { db } = useFirebase();
  const [jobs, setJobs] = React.useState<Job[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filters, setFilters] = React.useState(initialFilters);
  const [allStatuses, setAllStatuses] = React.useState<string[]>([]);
  const [sortConfig, setSortConfig] = React.useState<{ key: SortableKeys; direction: 'ascending' | 'descending' } | null>({ key: 'postedAt', direction: 'descending' });
  const { setHelp } = useHelp();
  const [view, setView] = React.useState<'list' | 'grid'>('list');

  React.useEffect(() => {
    setHelp({
      title: "All Jobs",
      content: (
        <div className="space-y-4 text-sm">
          <p>This is the master view of every job ever created on the platform. As an admin, you can monitor all activity from here.</p>
          <ul className="list-disc space-y-2 pl-5">
            <li><span className="font-semibold">Comprehensive Filters:</span> Use the filters at the top to narrow down the list by job title, pincode, status, job giver, type (Bidding vs. Direct Award), or date range.</li>
            <li><span className="font-semibold">Sortable Columns:</span> Click on any column header in the table to sort the jobs. Click again to reverse the order.</li>
            <li><span className="font-semibold">Export Data:</span> Use the "Export to CSV" button to download the currently filtered list for offline analysis.</li>
            <li><span className="font-semibold">View Details:</span> Click on any job row to navigate to its detailed view, where you can see all bids, comments, and job-specific information.</li>
          </ul>
        </div>
      )
    })
  }, [setHelp]);

  React.useEffect(() => {
    if (!userLoading && !isAdmin) {
      router.push('/dashboard');
    }
  }, [user, isAdmin, router, userLoading]);

  React.useEffect(() => {
    async function fetchJobs() {
      if (!db || !user || !isAdmin) return;

      setLoading(true);
      const jobsCollection = collection(db, 'jobs');
      const jobSnapshot = await getDocs(query(jobsCollection));
      const jobList = jobSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Job);

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

      setJobs(populatedJobs);
      const uniqueStatuses = Array.from(new Set(populatedJobs.map(j => j.status)));
      setAllStatuses(['all', ...uniqueStatuses.sort()]);
      setLoading(false);
    }

    if (db && user && isAdmin) {
      fetchJobs();
    }
  }, [user, db, isAdmin]);


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

  const handleExport = () => {
    const dataToExport = filteredAndSortedJobs.map(job => ({
      ID: job.id,
      Title: job.title,
      Status: job.status,
      'Job Giver': (job.jobGiver as User)?.name || 'N/A',
      Bids: (job.bids || []).length,
      'Job Type': getJobType(job),
      'Posted Date': format(toDate(job.postedAt), 'yyyy-MM-dd'),
      Location: job.location,
    }));
    exportToCsv(`cctv-jobs-${new Date().toISOString().split('T')[0]}.csv`, dataToExport);
  };


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

  return (
    <Card>
      <CardHeader className="sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>All Jobs</CardTitle>
          <CardDescription>A list of all jobs created on the platform. Click on a job to view details.</CardDescription>
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
          <Button onClick={handleExport} variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export to CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters Section - visible on all screen sizes */}
        <div className="flex flex-col gap-2 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2">
            <Input placeholder="Filter by Job Title..." value={filters.jobId} onChange={e => handleFilterChange('jobId', e.target.value)} className="h-8 lg:col-span-1" />
            <Input placeholder="Filter by Pincode..." value={filters.pincode} onChange={e => handleFilterChange('pincode', e.target.value)} className="h-8" />
            <Select value={filters.status} onValueChange={value => handleFilterChange('status', value)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Filter by status..." />
              </SelectTrigger>
              <SelectContent>
                {allStatuses.map(status => (
                  <SelectItem key={status} value={status}>{status === 'all' ? 'All Statuses' : status}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input placeholder="Filter by Job Giver..." value={filters.jobGiver} onChange={e => handleFilterChange('jobGiver', e.target.value)} className="h-8" />
            <Select value={filters.jobType} onValueChange={value => handleFilterChange('jobType', value)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Filter by Type..." />
              </SelectTrigger>
              <SelectContent>
                {jobTypes.map(type => (
                  <SelectItem key={type} value={type}>{type === 'all' ? 'All Types' : type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="date"
                  variant={"outline"}
                  size="sm"
                  className={cn(
                    "w-full justify-start text-left font-normal h-8",
                    !filters.date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.date?.from ? (
                    filters.date.to ? (
                      <>
                        {format(filters.date.from, "LLL dd, y")} -{" "}
                        {format(filters.date.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(filters.date.from, "LLL dd, y")
                    )
                  ) : (
                    <span>Filter by date...</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={filters.date?.from}
                  selected={filters.date}
                  onSelect={value => handleFilterChange('date', value)}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>

            {activeFiltersCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs">
                <X className="h-3 w-3 mr-1" />
                Clear Filters ({activeFiltersCount})
              </Button>
            )}
          </div>
        </div>

        {view === 'list' && (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>
                  <Button variant="ghost" onClick={() => requestSort('title')}>
                    Job Title
                    {getSortIcon('title')}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => requestSort('status')}>
                    Status
                    {getSortIcon('status')}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => requestSort('jobGiver')}>
                    Job Giver
                    {getSortIcon('jobGiver')}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => requestSort('bids')}>
                    Bids
                    {getSortIcon('bids')}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => requestSort('jobType')}>
                    Job Type
                    {getSortIcon('jobType')}
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                  <Button variant="ghost" onClick={() => requestSort('postedAt')}>
                    Posted
                    {getSortIcon('postedAt')}
                  </Button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    Loading jobs...
                  </TableCell>
                </TableRow>
              ) : filteredAndSortedJobs.length > 0 ? (
                filteredAndSortedJobs.map((job) => (
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
                  <TableCell colSpan={6} className="h-24 text-center">
                    No jobs found for your search.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}

        {view === 'grid' && (
          <div>
            {loading ? (
              <div className="text-center py-10 text-muted-foreground">Loading jobs...</div>
            ) : filteredAndSortedJobs.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredAndSortedJobs.map((job) => (
                  <JobCard key={job.id} job={job} onRowClick={handleRowClick} />
                ))}
              </div>
            ) : (
              <div className="text-center py-10 text-muted-foreground">No jobs found for your search.</div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}


