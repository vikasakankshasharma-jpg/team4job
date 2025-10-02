
"use client";

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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Calendar } from "@/components/ui/calendar";
import { useRouter } from "next/navigation";
import React from "react";
import { Job, User } from "@/lib/types";
import { getStatusVariant, toDate, cn } from "@/lib/utils";
import { jobs as mockJobs } from "@/lib/data";
import { useUser } from "@/hooks/use-user";
import { format } from "date-fns";
import { IndianRupee, ListFilter, Calendar as CalendarIcon, X } from "lucide-react";
import { useSearch } from "@/hooks/use-search";
import type { DateRange } from "react-day-picker";

export default function AllJobsPage() {
  const router = useRouter();
  const { role } = useUser();
  const [jobs, setJobs] = React.useState<Job[]>(mockJobs);
  const [loading, setLoading] = React.useState(false);
  const { searchQuery } = useSearch();
  const [date, setDate] = React.useState<DateRange | undefined>(undefined);

  React.useEffect(() => {
    if (role && role !== 'Admin') {
      router.push('/dashboard');
    }
  }, [role, router]);

  const filteredJobs = React.useMemo(() => {
    const cleanedQuery = searchQuery.trim().toLowerCase().replace(/ /g, '-');
    
    let filtered = jobs;

    if (cleanedQuery) {
        filtered = filtered.filter(job => 
            job.title.toLowerCase().includes(cleanedQuery) ||
            job.id.toLowerCase().includes(cleanedQuery) ||
            (job.jobGiver as User)?.anonymousId?.toLowerCase().includes(cleanedQuery)
        );
    }

    if (date?.from && date?.to) {
        filtered = filtered.filter(job => {
            const postedDate = toDate(job.postedAt);
            return postedDate >= date.from! && postedDate <= date.to!;
        });
    }

    return filtered;
  }, [jobs, searchQuery, date]);

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
    setDate(undefined);
  }
  
  const activeFiltersCount = [
    date !== undefined
  ].filter(Boolean).length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
            <CardTitle>All Jobs</CardTitle>
            <CardDescription>A list of all jobs created on the platform. Click on a row to view details.</CardDescription>
        </div>
         <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1">
                  <ListFilter className="h-3.5 w-3.5" />
                  <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                    Filter
                  </span>
                  {activeFiltersCount > 0 && <Badge variant="secondary" className="rounded-full h-5 w-5 p-0 flex items-center justify-center">{activeFiltersCount}</Badge>}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-auto p-4 space-y-4">
                <DropdownMenuLabel>Filter by Posted Date</DropdownMenuLabel>
                <DropdownMenuSeparator className="-mx-4" />
                
                 <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                          "w-[300px] justify-start text-left font-normal",
                          !date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date?.from ? (
                          date.to ? (
                            <>
                              {format(date.from, "LLL dd, y")} -{" "}
                              {format(date.to, "LLL dd, y")}
                            </>
                          ) : (
                            format(date.from, "LLL dd, y")
                          )
                        ) : (
                          <span>Pick a date range</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={date?.from}
                        selected={date}
                        onSelect={setDate}
                        numberOfMonths={2}
                      />
                    </PopoverContent>
                  </Popover>

              </DropdownMenuContent>
            </DropdownMenu>
             {activeFiltersCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Job Title</TableHead>
              <TableHead>Job ID</TableHead>
              <TableHead>Pincode</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden sm:table-cell">Job Giver</TableHead>
              <TableHead className="hidden md:table-cell">Bids</TableHead>
              <TableHead className="text-right">Posted</TableHead>
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
                  </TableCell>
                   <TableCell>
                     <p className="text-xs text-muted-foreground font-mono">{job.id}</p>
                  </TableCell>
                   <TableCell>
                     <p className="text-sm text-muted-foreground">{job.location.split(',')[0]}</p>
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
