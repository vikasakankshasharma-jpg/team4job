
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
import { useRouter } from "next/navigation";
import React from "react";
import { Job, User } from "@/lib/types";
import { getStatusVariant, toDate } from "@/lib/utils";
import { jobs as mockJobs } from "@/lib/data";
import { useUser } from "@/hooks/use-user";
import { format } from "date-fns";
import { IndianRupee } from "lucide-react";
import { useSearch } from "@/hooks/use-search";

export default function AllJobsPage() {
  const router = useRouter();
  const { role } = useUser();
  const [jobs, setJobs] = React.useState<Job[]>(mockJobs);
  const [loading, setLoading] = React.useState(false);
  const { searchQuery } = useSearch();

  React.useEffect(() => {
    if (role && role !== 'Admin') {
      router.push('/dashboard');
    }
  }, [role, router]);

  const filteredJobs = React.useMemo(() => {
    const cleanedQuery = searchQuery.trim().toLowerCase();
    if (!cleanedQuery) return jobs;
    return jobs.filter(job => 
      job.title.toLowerCase().includes(cleanedQuery) ||
      job.id.toLowerCase().includes(cleanedQuery) ||
      (job.jobGiver as User)?.anonymousId?.toLowerCase().includes(cleanedQuery)
    );
  }, [jobs, searchQuery]);

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
              <TableHead className="hidden sm:table-cell">Budget</TableHead>
              <TableHead className="hidden md:table-cell">Bids</TableHead>
              <TableHead className="text-right">Posted</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
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
                  <TableCell className="hidden sm:table-cell">
                    <div className="flex items-center gap-1">
                        {job.budget ? `₹${job.budget.min.toLocaleString()} - ₹${job.budget.max.toLocaleString()}` : 'N/A'}
                    </div>
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
                    <TableCell colSpan={6} className="h-24 text-center">
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
