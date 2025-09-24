
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
  CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import Link from "next/link";
import { jobs } from "@/lib/data";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal } from "lucide-react"
import { useSearchParams } from "next/navigation";
import { Job } from "@/lib/types";
import { getStatusVariant } from "@/lib/utils";
import { useUser } from "@/hooks/use-user";

function PostedJobsTable({ jobs, title, description, footerText }: { jobs: Job[], title: string, description: string, footerText: string }) {
  return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Bids</TableHead>
                <TableHead className="hidden md:table-cell">Posted On</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map(job => (
                 <TableRow key={job.id}>
                    <TableCell className="font-medium">
                      <Link href={`/dashboard/jobs/${job.id}`} className="hover:underline">{job.title}</Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(job.status)}>{job.status}</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{job.bids.length}</TableCell>
                    <TableCell className="hidden md:table-cell">{format(new Date(job.postedAt), "MMM d, yyyy")}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            aria-haspopup="true"
                            size="icon"
                            variant="ghost"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Toggle menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                           <DropdownMenuItem asChild><Link href={`/dashboard/jobs/${job.id}`}>View Details</Link></DropdownMenuItem>
                          <DropdownMenuItem>Edit</DropdownMenuItem>
                          <DropdownMenuItem>Close Bidding</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
              ))}
               {jobs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24">You haven't posted any jobs in this category.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
         <CardFooter>
           <div className="text-xs text-muted-foreground">
            {footerText}
          </div>
        </CardFooter>
      </Card>
  )
}


export default function PostedJobsPage() {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") || "active";
  const { user } = useUser();
  
  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>My Posted Jobs</CardTitle>
          <CardDescription>
            Loading your jobs...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>Please log in to see your posted jobs.</p>
        </CardContent>
      </Card>
    );
  }

  const myJobs = jobs.filter(job => job.jobGiver.id === user.id);
  const activeJobs = myJobs.filter(job => job.status !== 'Completed');
  const archivedJobs = myJobs.filter(job => job.status === 'Completed');

  return (
     <Tabs defaultValue={tab}>
        <div className="flex items-center">
          <TabsList>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="archived">Archived</TabsTrigger>
          </TabsList>
          <div className="ml-auto flex items-center gap-2">
            <Button size="sm" className="h-8 gap-1" asChild>
                <Link href="/dashboard/post-job">
                    <PlusCircle className="h-3.5 w-3.5" />
                    <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                        Post New Job
                    </span>
                </Link>
            </Button>
          </div>
        </div>
        <TabsContent value="active">
          <PostedJobsTable 
            jobs={activeJobs}
            title="My Active Jobs"
            description="Manage your job postings and review bids from installers."
            footerText={`Showing 1-${activeJobs.length} of ${activeJobs.length} active jobs`}
          />
        </TabsContent>
         <TabsContent value="archived">
          <PostedJobsTable 
            jobs={archivedJobs}
            title="My Archived Jobs"
            description="A history of your completed projects."
            footerText={`Showing 1-${archivedJobs.length} of ${archivedJobs.length} archived jobs`}
          />
        </TabsContent>
      </Tabs>
  )
}
