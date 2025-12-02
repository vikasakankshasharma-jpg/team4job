
"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
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
import { Award, IndianRupee, ListFilter, X, Loader2, List, Grid } from "lucide-react";
import { Job, Bid, User } from "@/lib/types";
import React, { useEffect, useCallback, useMemo } from "react";
import { getStatusVariant, toDate, cn } from "@/lib/utils";
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
import { collection, query, where, getDocs, doc } from "firebase/firestore";

const getRefId = (ref: any): string | null => {
  if (!ref) return null;
  if (typeof ref === 'string') return ref;
  return ref.id || null;
}

const getMyBidStatus = (job: Job, user: User): { text: string; variant: "default" | "secondary" | "success" | "warning" | "info" | "destructive" | "outline" | null | undefined } => {
    const awardedId = getRefId(job.awardedInstaller);
    const won = awardedId === user.id;

    if (won) {
        if (job.status === 'Completed') return { text: 'Completed & Won', variant: 'success' };
        if (job.status === 'In Progress') return { text: 'In Progress', variant: 'info' };
        if (job.status === 'Awarded') return { text: 'Awarded', variant: 'success' };
    }

    if (job.status === 'Cancelled') return { text: 'Cancelled', variant: 'destructive' };
    if (job.status === 'Open for Bidding') return { text: 'Bidded', variant: 'default' };

    if ((job.status === 'Bidding Closed' || job.status === 'Awarded' || job.status === 'In Progress' || job.status === 'Completed') && !won) {
        return { text: 'Not Selected', variant: 'destructive' };
    }
    
    return { text: job.status, variant: getStatusVariant(job.status) };
}

function MyBidRow({ bid, job, user }: { bid: Bid & { jobId: string }; job: Job; user: User; }) {
    const timeAgo = formatDistanceToNow(toDate(bid.timestamp), { addSuffix: true });
    const myBidStatus = getMyBidStatus(job, user);
    
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
                    <span className="text-muted-foreground">Direct Award</span>
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
                        +{pointsEarned} pts
                    </div>
                ) : (
                    <span className="text-muted-foreground">—</span>
                )}
            </TableCell>
        </TableRow>
    );
}

function MyBidCard({ bid, job, user }: { bid: Bid & { jobId: string }; job: Job; user: User; }) {
    const router = useRouter();
    const myBidStatus = getMyBidStatus(job, user);

    return (
        <Card onClick={() => router.push(`/dashboard/jobs/${bid.jobId}`)} className="cursor-pointer">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <CardTitle className="text-base leading-tight pr-4">{job.title}</CardTitle>
                    <Badge variant={myBidStatus.variant}>{myBidStatus.text}</Badge>
                </div>
                <CardDescription className="font-mono text-xs pt-1">{job.id}</CardDescription>
            </CardHeader>
            <CardContent className="text-sm space-y-3">
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Your Bid</span>
                    <span className="font-semibold flex items-center gap-1"><IndianRupee className="h-4 w-4"/>{bid.amount.toLocaleString()}</span>
                </div>
                 <div className="flex justify-between">
                    <span className="text-muted-foreground">Job Status</span>
                    <Badge variant={getStatusVariant(job.status)}>{job.status}</Badge>
                </div>
            </CardContent>
            <CardFooter className="text-xs text-muted-foreground">
                Bid placed {formatDistanceToNow(toDate(bid.timestamp), { addSuffix: true })}
            </CardFooter>
        </Card>
    );
}

function MyBidsPageContent() {
  const { user, role, loading: userLoading } = useUser();
  const { db } = useFirebase();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const statusFilter = searchParams.get('status') || 'All';
  const { setHelp } = useHelp();
  
  const [jobs, setJobs] = React.useState<Job[]>([]);
  const [bids, setBids] = React.useState<(Bid & { jobId: string })[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [view, setView] = React.useState<'list' | 'grid'>('list');

  useEffect(() => {
    if (!userLoading && role && role !== 'Installer') {
      router.push('/dashboard');
    }
  }, [role, userLoading, router]);

  const fetchMyBids = useCallback(async () => {
    if (!user || !role || role !== 'Installer' || !db) return;
    setLoading(true);
    try {
      const jobsRef = collection(db, 'jobs');
      const q = query(jobsRef, where('bidderIds', 'array-contains', user.id));
      const jobsSnapshot = await getDocs(q);
      
      const fetchedJobs: Job[] = [];
      const fetchedBids: (Bid & { jobId: string })[] = [];

      jobsSnapshot.forEach(doc => {
        const jobData = { id: doc.id, ...doc.data() } as Job;
        fetchedJobs.push(jobData);
        if (jobData.bids) {
            jobData.bids.forEach(bid => {
                if (getRefId(bid.installer) === user.id) {
                    fetchedBids.push({ ...bid, jobId: doc.id });
                }
            });
        }
      });
      setJobs(fetchedJobs);
      setBids(fetchedBids);
    } catch (error) {
      console.error("Failed to fetch bids and jobs:", error);
    } finally {
      setLoading(false);
    }
  }, [user, role, db]);

  React.useEffect(() => {
    if (!userLoading) {
        fetchMyBids();
    }
  }, [fetchMyBids, userLoading]);

  useEffect(() => {
    setHelp({
        title: 'My Bids Guide', 
        content: (
          <div className="space-y-4 text-sm">
              <p>This page tracks every job you have bid on. Use the filter to see jobs with a specific status.</p>
                <ul className="list-disc space-y-2 pl-5">
                    <li><span className="font-semibold">Bidded:</span> You have placed a bid, but the job is still open for other installers to bid on.</li>
                    <li><span className="font-semibold">Awarded:</span> Congratulations! The Job Giver has selected you. You must accept the job to proceed.</li>
                    <li><span className="font-semibold">In Progress:</span> You have accepted the job and can now communicate with the Job Giver.</li>
                    <li><span className="font-semibold">Completed & Won:</span> The job is finished and you have been paid. You'll see any reputation points you earned here.</li>
                    <li><span className="font-semibold">Not Selected:</span> The Job Giver chose another installer for this project.</li>
                </ul>
          </div>
        )
    });
  }, [setHelp]);
  
  if (userLoading || loading) {
    return (
      <div className="flex items-center justify-center h-96">
           <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
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

  const pageTitle = statusFilter === 'All' ? 'My Bids' : `${statusFilter} Bids`;
  const pageDescription = statusFilter === 'All' ? 'A history of all bids you have placed.' : `A list of your bids that are ${statusFilter.toLowerCase()}.`;
  const bidStatuses = ["All", "Bidded", "Awarded", "In Progress", "Completed & Won", "Not Selected", "Cancelled"];

  return (
    <div className="grid flex-1 items-start gap-4 md:gap-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{pageTitle}</CardTitle>
            <CardDescription>{pageDescription}</CardDescription>
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1">
                  <ListFilter className="h-3.5 w-3.5" />
                  <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Filter</span>
                  {statusFilter !== 'All' && <Badge variant="secondary" className="rounded-full h-5 w-5 p-0 flex items-center justify-center">1</Badge>}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup value={statusFilter} onValueChange={handleFilterChange}>
                  {bidStatuses.map(status => (
                    <DropdownMenuRadioItem key={status} value={status}>{status}</DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            {statusFilter !== 'All' && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
            {view === 'list' ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job Title</TableHead>
                    <TableHead>Your Bid</TableHead>
                    <TableHead className="hidden md:table-cell">Placed</TableHead>
                    <TableHead>Job Status</TableHead>
                    <TableHead>My Bid Status</TableHead>
                    <TableHead className="text-right">Points Earned</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                     <TableRow>
                        <TableCell colSpan={6} className="h-64 text-center text-muted-foreground">
                          <Loader2 className="h-6 w-6 animate-spin inline-block mr-2"/>
                          Loading your bids...
                        </TableCell>
                     </TableRow>
                  ) : filteredBids.length > 0 ? (
                    filteredBids.map(bid => {
                      const job = jobsById.get(bid.jobId);
                      if (!job || !user) return null; 
                      return <MyBidRow key={bid.id} bid={bid} job={job} user={user} />
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center h-64">
                        {statusFilter !== 'All'
                          ? `You have no bids with status "${statusFilter}".`
                          : "You haven't placed any bids yet."
                        }
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
                            return <MyBidCard key={bid.id} bid={bid} job={job} user={user} />;
                        })
                    ) : (
                        <div className="col-span-full text-center py-10 text-muted-foreground">
                             {statusFilter !== 'All'
                                ? `You have no bids with status "${statusFilter}".`
                                : "You haven't placed any bids yet."
                             }
                        </div>
                    )}
                 </div>
            )}
        </CardContent>
        <CardFooter>
            <div className="text-xs text-muted-foreground">
                Showing <strong>{filteredBids.length}</strong> of your <strong>{bids.length}</strong> total bids.
            </div>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function MyBidsPage() {
    return <MyBidsPageContent />
}
