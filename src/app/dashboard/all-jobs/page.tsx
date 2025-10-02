
"use client";

import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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

import { Job, User } from "@/lib/types";
import { getStatusVariant, toDate, cn } from "@/lib/utils";
import { jobs as mockJobs } from "@/lib/data";
import { useUser } from "@/hooks/use-user";

const initialFilters = {
    jobId: "",
    pincode: "",
    status: "all",
    awardType: "all",
    jobGiver: "",
    date: undefined as DateRange | undefined,
};

export default function AllJobsPage() {
  const router = useRouter();
  const { role } = useUser();
  const [jobs] = React.useState<Job[]>(mockJobs);
  const [loading, setLoading] = React.useState(false);
  const [filters, setFilters] = React.useState(initialFilters);

  React.useEffect(() => {
    if (role && role !== 'Admin') {
      router.push('/dashboard');
    }
  }, [role, router]);

  const handleFilterChange = (filterName: keyof typeof filters, value: any) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };

  const getAwardType = (job: Job) => {
    if (!job.awardedInstaller) return 'N/A';
    const awardedInstallerId = typeof job.awardedInstaller === 'string' ? job.awardedInstaller : (job.awardedInstaller as User).id;
    const bidderIds = job.bids.map(b => (b.installer as User).id);
    return bidderIds.includes(awardedInstallerId) ? 'Bidding' : 'Direct';
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
     if (filters.awardType !== 'all') {
        filtered = filtered.filter(job => getAwardType(job) === filters.awardType);
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
  
  const jobStatuses = ["All", ...Array.from(new Set(mockJobs.map(j => j.status)))];
  const awardTypes = ["All", "Bidding", "Direct"];
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>All Jobs</CardTitle>
        <CardDescription>A list of all jobs created on the platform. Click on a row to view details.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Job Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden sm:table-cell">Job Giver</TableHead>
              <TableHead className="hidden md:table-cell">Bids</TableHead>
              <TableHead className="hidden lg:table-cell">Award Type</TableHead>
              <TableHead className="text-right flex items-center gap-2 justify-end">
                Posted
                {activeFiltersCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="h-auto px-2 py-1 text-xs">
                    <X className="h-3 w-3 mr-1" />
                    Clear Filters ({activeFiltersCount})
                  </Button>
                )}
              </TableHead>
            </TableRow>
             <TableRow className="hover:bg-transparent">
                <TableCell className="p-1">
                    <Input placeholder="Filter by Job Title..." value={filters.jobId} onChange={e => handleFilterChange('jobId', e.target.value)} className="h-8" />
                </TableCell>
                 <TableCell className="p-1">
                    <Select value={filters.status} onValueChange={value => handleFilterChange('status', value)}>
                        <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Filter by status..." />
                        </SelectTrigger>
                        <SelectContent>
                            {jobStatuses.map(status => (
                                <SelectItem key={status} value={status === 'All' ? 'all' : status}>{status}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </TableCell>
                <TableCell className="p-1 hidden sm:table-cell">
                    <Input placeholder="Filter by Job Giver..." value={filters.jobGiver} onChange={e => handleFilterChange('jobGiver', e.target.value)} className="h-8" />
                </TableCell>
                <TableCell className="p-1 hidden md:table-cell"></TableCell>
                <TableCell className="p-1 hidden lg:table-cell">
                    <Select value={filters.awardType} onValueChange={value => handleFilterChange('awardType', value)}>
                        <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Filter by Award Type..." />
                        </SelectTrigger>
                        <SelectContent>
                            {awardTypes.map(type => (
                                <SelectItem key={type} value={type === 'All' ? 'all' : type}>{type}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </TableCell>
                <TableCell className="p-1 text-right">
                   <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="date"
                        variant={"outline"}
                        size="sm"
                        className={cn(
                          "w-full lg:w-[240px] justify-start text-left font-normal h-8",
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
                </TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  Loading jobs...
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
                  <TableCell className="hidden sm:table-cell">
                    {(job.jobGiver as User)?.anonymousId || 'N/A'}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {job.bids?.length || 0}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                     {getAwardType(job)}
                  </TableCell>
                  <TableCell className="text-right">
                    {format(toDate(job.postedAt), 'MMM d, yyyy')}
                  </TableCell>
                </TableRow>
              ))
            ) : (
                 <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      No jobs found for your search.
                    </TableCell>
                  </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
