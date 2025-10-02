
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
import { Calendar as CalendarIcon, X } from "lucide-react";
import { collection, getDocs, doc, getDoc, DocumentData } from "firebase/firestore";
import { db } from "@/lib/firebase/client-config";

import { Job, User } from "@/lib/types";
import { getStatusVariant, toDate, cn } from "@/lib/utils";
import { useUser } from "@/hooks/use-user";

const initialFilters = {
    jobId: "",
    pincode: "",
    status: "all",
    jobType: "all",
    jobGiver: "",
    date: undefined as DateRange | undefined,
};

function getJobType(job: Job) {
    if (!job.awardedInstaller) return 'N/A';

    // The awardedInstaller might be a DocumentReference or a populated object.
    // For simplicity with Firestore refs, we need a robust check.
    // This mock logic assumes we've fetched and attached the necessary data.
    if (!job.bids || job.bids.length === 0) return 'Direct';

    const awardedInstallerId = (job.awardedInstaller as User)?.id || job.awardedInstaller;
    const bidderIds = job.bids.map(b => (b.installer as User).id);

    return bidderIds.includes(awardedInstallerId as string) ? 'Bidding' : 'Direct';
};

function JobCard({ job, onRowClick }: { job: Job, onRowClick: (jobId: string) => void }) {
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
                    <span className="font-medium">{(job.jobGiver as User)?.anonymousId || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Bids</span>
                    <span className="font-medium">{job.bids?.length || 0}</span>
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
  const { role } = useUser();
  const [jobs, setJobs] = React.useState<Job[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filters, setFilters] = React.useState(initialFilters);
  const [allStatuses, setAllStatuses] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (role && role !== 'Admin') {
      router.push('/dashboard');
    }
  }, [role, router]);

  React.useEffect(() => {
    const fetchJobs = async () => {
      setLoading(true);
      try {
        const jobsCollection = collection(db, 'jobs');
        const jobSnapshot = await getDocs(jobsCollection);
        const jobList = await Promise.all(jobSnapshot.docs.map(async (jobDoc) => {
          const jobData = jobDoc.data() as DocumentData;

          // Fetch referenced jobGiver
          let jobGiverData: User | null = null;
          if (jobData.jobGiver) {
            const giverDoc = await getDoc(jobData.jobGiver);
            if (giverDoc.exists()) {
              jobGiverData = giverDoc.data() as User;
            }
          }
          
          return {
            ...jobData,
            id: jobDoc.id,
            postedAt: (jobData.postedAt)?.toDate(),
            deadline: (jobData.deadline)?.toDate(),
            jobStartDate: (jobData.jobStartDate)?.toDate(),
            jobGiver: jobGiverData,
          } as Job;
        }));

        setJobs(jobList);
        const uniqueStatuses = Array.from(new Set(jobList.map(j => j.status)));
        setAllStatuses(['All', ...uniqueStatuses]);

      } catch (error) {
        console.error("Error fetching jobs from Firestore:", error);
      } finally {
        setLoading(false);
      }
    };

    if (role === 'Admin') {
      fetchJobs();
    }
  }, [role]);


  const handleFilterChange = (filterName: keyof typeof filters, value: any) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };

  const filteredJobs = React.useMemo(() => {
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
        filtered = filtered.filter(job => (job.jobGiver as User)?.anonymousId?.toLowerCase().includes(filters.jobGiver.toLowerCase()));
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

    return filtered;
  }, [jobs, filters]);

  if (role !== 'Admin') {
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
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>All Jobs</CardTitle>
        <CardDescription>A list of all jobs created on the platform. Click on a job to view details.</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Filters Section - visible on all screen sizes */}
        <div className="flex flex-col gap-2 mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2">
                <Input placeholder="Filter by Job Title..." value={filters.jobId} onChange={e => handleFilterChange('jobId', e.target.value)} className="h-8 lg:col-span-1" />
                <Select value={filters.status} onValueChange={value => handleFilterChange('status', value)}>
                    <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Filter by status..." />
                    </SelectTrigger>
                    <SelectContent>
                        {allStatuses.map(status => (
                            <SelectItem key={status} value={status === 'All' ? 'all' : status}>{status}</SelectItem>
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
                  <TableHead>Job Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Job Giver</TableHead>
                  <TableHead>Bids</TableHead>
                  <TableHead>Job Type</TableHead>
                  <TableHead className="text-right">Posted</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      Loading jobs from Firestore...
                    </TableCell>
                  </TableRow>
                ) : filteredJobs.length > 0 ? (
                  filteredJobs.map((job) => (
                    <TableRow key={job.id} onClick={() => handleRowClick(job.id)} className="cursor-pointer">
                      <TableCell>
                         <p className="font-medium">{job.title}</p>
                         <p className="text-xs text-muted-foreground font-mono">{job.id}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(job.status)}>{job.status}</Badge>
                      </TableCell>
                      <TableCell>
                        {(job.jobGiver as User)?.anonymousId || 'N/A'}
                      </TableCell>
                      <TableCell>
                        {job.bids?.length || 0}
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
                <div className="text-center py-10 text-muted-foreground">Loading jobs from Firestore...</div>
            ) : filteredJobs.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {filteredJobs.map((job) => (
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

