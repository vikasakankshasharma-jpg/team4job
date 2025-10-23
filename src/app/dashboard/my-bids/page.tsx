
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
import { Award, IndianRupee, ListFilter, X, Loader2 } from "lucide-react";
import { Job, Bid, User } from "@/lib/types";
import React, { useEffect, useCallback } from "react";
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
import type { DocumentReference } from "firebase/firestore";

type MyBidRowProps = {
  bid: Bid & { jobId: string };
  job: Job;
  user: User;
}

const getRefId = (ref: any): string | null => {
  if (!ref) return null;
  if (typeof ref === 'string') return ref;
  return ref.id || null;
}

function MyBidRow({ bid, job, user }: MyBidRowProps) {
    const [timeAgo, setTimeAgo] = React.useState('');

    React.useEffect(() => {
        if (bid.timestamp) {
            setTimeAgo(formatDistanceToNow(toDate(bid.timestamp), { addSuffix: true }));
        }
    }, [bid.timestamp]);
    
    const getMyBidStatus = (): { text: string; variant: "default" | "secondary" | "success" | "warning" | "info" | "destructive" | "outline" | null | undefined } => {
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
    
    const calculatePoints = () => {
        if (job.status !== 'Completed') return null;
        const awardedId = getRefId(job.awardedInstaller);
        if (awardedId !== user.id || !job.rating) return null;

        const ratingPoints = job.rating === 5 ? 20 : job.rating === 4 ? 10 : 0;
        const completionPoints = 50;
        return completionPoints + ratingPoints;
    }

    const myBidStatus = getMyBidStatus();
    const pointsEarned = calculatePoints();

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

const bidStatuses = [
    "All", "Bidded", "Awarded", "In Progress", "Completed & Won", "Not Selected", "Cancelled"
];

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
                const installerId = getRefId(bid.installer);
                if (installerId === user.id) {
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
    const params = new URLSearchParams(searchParams);
    if (newStatus && newStatus !== 'All') {
      params.set('status', newStatus);
    } else {
      params.delete('status');
    }
    router.replace(`${pathname}?${params.toString()}`);
  };

  const clearFilters = () => router.replace(pathname);

  const getMyBidStatusText = (job: Job, user: User): string => {
    const awardedId = getRefId(job.awardedInstaller);
    const won = awardedId === user.id;
    if (won) {
        if (job.status === 'Completed') return 'Completed & Won';
        if (job.status === 'In Progress') return 'In Progress';
        if (job.status === 'Awarded') return 'Awarded';
    }
    if (job.status === 'Cancelled') return 'Cancelled';
    if (job.status === 'Open for Bidding') return 'Bidded';
    if (!won && ['Bidding Closed', 'Awarded', 'In Progress', 'Completed'].includes(job.status)) {
        return 'Not Selected';
    }
    return job.status;
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

  return (
    <div className="grid flex-1 items-start gap-4 md:gap-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{pageTitle}</CardTitle>
            <CardDescription>{pageDescription}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
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
        </CardContent>
        <CardFooter>
            <div className="text-xs text-muted-foreground">
                Showing <strong>{filteredBids.length}</strong> bids.
            </div>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function MyBidsPage() {
    return <MyBidsPageContent />
}
