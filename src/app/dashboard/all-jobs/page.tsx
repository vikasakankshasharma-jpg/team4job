
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
import { Calendar as CalendarIcon, X, ArrowUpDown } from "lucide-react";
import { Job, User } from "@/lib/types";
import { getStatusVariant, toDate, cn } from "@/lib/utils";
import { useUser } from "@/hooks/use-user";
import { useFirebase } from "@/lib/firebase/client-provider";
import Link from "next/link";
import { collection, getDocs, query, DocumentReference, getDoc } from "firebase/firestore";

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

    const awardedInstallerId = (job.awardedInstaller as User)?.id || (job.awardedInstaller as DocumentReference)?.id;
    if (!job.bids || job.bids.length === 0) return 'Direct';

    const bidderIds = (job.bids || []).map(b => (b.installer as User).id || (b.installer as DocumentReference).id);

    return bidderIds.includes(awardedInstallerId as string) ? 'Bidding' : 'Direct';
};

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

export default function AllJobsPage() {
  const router = useRouter();
  const { user } = useUser();
  const { db } = useFirebase();
  const [jobs, setJobs] = React.useState<Job[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filters, setFilters] = React.useState(initialFilters);
  const [allStatuses, setAllStatuses] = React.useState<string[]>([]);
  const [sortConfig, setSortConfig] = React.useState<{ key: SortableKeys; direction: 'ascending' | 'descending' } | null>({ key: 'postedAt', direction: 'descending' });


  React.useEffect(() => {
    if (user && user.roles[0] !== 'Admin') {
      router.push('/dashboard');
    }
  }, [user, router]);

  React.useEffect(() => {
    async function fetchJobs() {
      if (user?.roles[0] === 'Admin') {
        const jobsCollection = collection(db, 'jobs');
        const q = query(jobsCollection);
        const jobSnapshot = await getDocs(q);
        const jobList = jobSnapshot.docs.map(doc => ({id: doc.id, ...doc.data()}) as Job);

        const usersMap = new Map<string, User>();
        
        const getUser = async (ref: DocumentReference) => {
            if (usersMap.has(ref.id)) {
                return usersMap.get(ref.id)!;
            }
            const docSnap = await getDoc(ref);
            if (docSnap.exists()) {
                const userData = { id: docSnap.id, ...docSnap.data() } as User;
                usersMap.set(ref.id, userData);
                return userData;
            }
            return ref;
        };

        const populatedJobs = await Promise.all(jobList.map(async (job) => {
            const jobGiver = await getUser(job.jobGiver as DocumentReference);
            const awardedInstaller = job.awardedInstaller ? await getUser(job.awardedInstaller as DocumentReference) : undefined;
            const bids = await Promise.all((job.bids || []).map(async (bid) => ({
                ...bid,
                installer: await getUser(bid.installer as DocumentReference)
            })));

            return {
                ...job,
                jobGiver,
                awardedInstaller,
                bids,
            };
        }));
        
        setJobs(populatedJobs);
        const uniqueStatuses = Array.from(new Set(populatedJobs.map(j => j.status)));
        setAllStatuses(['all', ...uniqueStatuses.sort()]);
        setLoading(false);
      }
    }
    if (db && user) {
        fetchJobs();
    }
  }, [user, db]);


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

  if (!user || user.roles[0] !== 'Admin') {
    return (
        <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Redirecting...</p>
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
  
  const jobTypes = ["All", "Bidding", "Direct"];

  const getSortIcon = (key: SortableKeys) => {
    if (!sortConfig || sortConfig.key !== key) {
        return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />;
    }
    return sortConfig.direction === 'ascending' ? '▲' : '▼';
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Jobs</CardTitle>
        <CardDescription>A list of all jobs created on the platform. Click on a job to view details.</CardDescription>
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
                            <SelectItem key={status} value={status}>{status}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Input placeholder="Filter by Job Giver Name..." value={filters.jobGiver} onChange={e => handleFilterChange('jobGiver', e.target.value)} className="h-8" />
                 <Select value={filters.jobType} onValueChange={value => handleFilterChange('jobType', value)}>
                    <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Filter by Type..." />
                    </SelectTrigger>
                    <SelectContent>
                        {jobTypes.map(type => (
                            <SelectItem key={type} value={type === 'All' ? 'all' : type}>{type}</SelectItem>
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

        {/* Desktop Table View */}
        <div className="hidden lg:block">
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
        </div>

         {/* Mobile Card View */}
         <div className="block lg:hidden">
            {loading ? (
                <div className="text-center py-10 text-muted-foreground">Loading jobs...</div>
            ) : filteredAndSortedJobs.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {filteredAndSortedJobs.map((job) => (
                        <JobCard key={job.id} job={job} onRowClick={handleRowClick} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-10 text-muted-foreground">No jobs found for your search.</div>
            )}
         </div>
      </CardContent>
    </Card>
  );
}
