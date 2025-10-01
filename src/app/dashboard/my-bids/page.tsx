
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
import { Award, IndianRupee, ListFilter, X } from "lucide-react";
import { Job, Bid, User } from "@/lib/types";
import React from "react";
import { getStatusVariant, toDate } from "@/lib/utils";
import { useUser } from "@/hooks/use-user";
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
import { jobs as allMockJobs } from "@/lib/data";

type MyBidRowProps = {
  bid: Bid & { jobTitle: string; jobId: string; jobStatus: Job['status'], wasPlaced: boolean };
  job?: Job;
  user?: User | null;
}

function MyBidRow({ bid, job, user }: MyBidRowProps) {
    const [timeAgo, setTimeAgo] = React.useState('');

    React.useEffect(() => {
        if (bid.timestamp && bid.wasPlaced) {
            setTimeAgo(formatDistanceToNow(toDate(bid.timestamp), { addSuffix: true }));
        } else if (!bid.wasPlaced) {
             setTimeAgo('Awarded Directly');
        }
    }, [bid.timestamp, bid.wasPlaced]);
    
    const getMyBidStatus = (): { text: string; variant: "default" | "secondary" | "success" | "warning" | "info" | "destructive" | "outline" | null | undefined } => {
        if (!job || !user) return { text: "Unknown", variant: "secondary" };

        const won = job.awardedInstaller === user.id;

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
        if (!job || job.status !== 'Completed' || job.awardedInstaller !== user?.id || !job.rating) {
            return null;
        }
        const ratingPoints = job.rating === 5 ? 20 : job.rating === 4 ? 10 : 0;
        const completionPoints = 50;
        return completionPoints + ratingPoints;
    }

    const myBidStatus = getMyBidStatus();
    const pointsEarned = calculatePoints();

    return (
        <TableRow>
            <TableCell className="font-medium">
                <Link href={`/dashboard/jobs/${bid.jobId}`} className="hover:underline">{bid.jobTitle}</Link>
            </TableCell>
            <TableCell>
                 {bid.amount > 0 ? (
                    <div className="flex items-center gap-1">
                        <IndianRupee className="h-4 w-4" />
                        {bid.amount.toLocaleString()}
                    </div>
                 ) : (
                    <span className="text-muted-foreground">—</span>
                 )}
            </TableCell>
            <TableCell className="hidden md:table-cell">
                {timeAgo || <span className="text-muted-foreground italic">Pending...</span>}
            </TableCell>
            <TableCell>
                <Badge variant={getStatusVariant(bid.jobStatus)}>{bid.jobStatus}</Badge>
            </TableCell>
            <TableCell>
                <Badge variant={myBidStatus.variant}>
                    {myBidStatus.text}
                </Badge>
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
    "All",
    "Bidded",
    "Awarded",
    "In Progress",
    "Completed & Won",
    "Not Selected",
    "Cancelled"
];

function MyBidsPageContent() {
  const { user } = useUser();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  let statusFilter = searchParams.get('status');
  const { setHelp } = useHelp();
  const [jobs, setJobs] = React.useState<Job[]>(allMockJobs);

  React.useEffect(() => {
    setHelp({
        title: 'My Bids Guide',
        content: (
            <div className="space-y-4 text-sm">
                <p>This page tracks every job you have bid on. Here’s what the different statuses mean:</p>
                <ul className="list-disc space-y-2 pl-5">
                    <li>
                        <span className="font-semibold">Bidded:</span> You have placed a bid, and the job is still open for other installers to bid on.
                    </li>
                    <li>
                        <span className="font-semibold">Awarded:</span> Congratulations! The Job Giver has chosen you for the project. The job is ready to be started.
                    </li>
                    <li>
                        <span className="font-semibold">In Progress:</span> You have started working on an awarded job.
                    </li>
                    <li>
                        <span className="font-semibold">Completed & Won:</span> You have successfully completed the job and received reputation points.
                    </li>
                     <li>
                        <span className="font-semibold">Not Selected:</span> The job was awarded to another installer, or the bidding period closed and you were not chosen.
                    </li>
                    <li>
                        <span className="font-semibold">Cancelled:</span> The job was cancelled by the Job Giver.
                    </li>
                </ul>
                <p>You can use the "Filter" button to view bids of a specific status, like seeing all the jobs you've won.</p>
            </div>
        )
    });
  }, [setHelp]);


  if (statusFilter === 'Completed') {
      statusFilter = 'Completed & Won';
  }
  
  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>My Bids</CardTitle>
          <CardDescription>
            Loading your bids...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>Please wait while we fetch your data.</p>
        </CardContent>
      </Card>
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

  const clearFilters = () => {
    router.replace(pathname);
  };
  
 const myBids = jobs.map(job => {
    const myBid = job.bids.find(bid => (bid.installer as User).id === user.id);
    
    if (myBid || job.awardedInstaller === user.id) {
      return {
        id: myBid?.id || `direct-award-${job.id}`,
        installer: user,
        amount: myBid?.amount || 0,
        timestamp: myBid?.timestamp || job.postedAt,
        coverLetter: myBid?.coverLetter || "Job awarded directly.",
        jobTitle: job.title,
        jobId: job.id,
        jobStatus: job.status,
        wasPlaced: !!myBid,
      };
    }
    return null;
  }).filter((bid): bid is Bid & { jobTitle: string; jobId: string; jobStatus: Job['status']; wasPlaced: boolean } => bid !== null)
    .sort((a,b) => toDate(b.timestamp).getTime() - toDate(a.timestamp).getTime());

 const getMyBidStatusText = (job: { id: string, status: Job['status'], awardedInstaller?: string | User; }): string => {
    if (!job || !user) return "Unknown";
    const awardedId = typeof job.awardedInstaller === 'string' ? job.awardedInstaller : (job.awardedInstaller as User)?.id;
    const won = awardedId === user.id;

    if (won) {
        if (job.status === 'Completed') return 'Completed & Won';
        if (job.status === 'In Progress') return 'In Progress';
        if (job.status === 'Awarded') return 'Awarded';
    }
    if (job.status === 'Cancelled') return 'Cancelled';
    if (job.status === 'Open for Bidding') return 'Bidded';
    if ((job.status === 'Bidding Closed' || job.status === 'Awarded' || job.status === 'In Progress' || job.status === 'Completed') && !won) {
        return 'Not Selected';
    }
    return job.status;
  }

  const filteredBids = myBids.filter(bid => {
    const job = jobs.find(j => j.id === bid.jobId);
    if (!job) return false;
    
    const bidStatus = getMyBidStatusText(job);
    if (!statusFilter || statusFilter === 'All') {
        return true;
    }

    if (statusFilter === 'Awarded') {
        return bidStatus === 'Awarded' || bidStatus === 'In Progress';
    }

    return bidStatus === statusFilter;
  });

  const pageTitle = statusFilter ? `${statusFilter} Bids` : 'My Bids';
  const pageDescription = statusFilter ? `A list of your bids that are ${statusFilter.toLowerCase()}.` : 'A history of all the bids you have placed and jobs you have won.';

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
                  <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                    Filter
                  </span>
                  {statusFilter && statusFilter !== 'All' && <Badge variant="secondary" className="rounded-full h-5 w-5 p-0 flex items-center justify-center">1</Badge>}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Filter by My Bid Status</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup value={statusFilter || 'All'} onValueChange={handleFilterChange}>
                  {bidStatuses.map(status => (
                    <DropdownMenuRadioItem key={status} value={status}>{status}</DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            {statusFilter && statusFilter !== 'All' && (
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
              {filteredBids.map(bid => {
                const job = jobs.find(j => j.id === bid.jobId);
                return <MyBidRow key={bid.id} bid={bid} job={job} user={user} />
              })}
               {filteredBids.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-24">
                    {statusFilter && statusFilter !== 'All'
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
                Showing <strong>{filteredBids.length}</strong> of <strong>{myBids.length}</strong> bids
            </div>
        </CardFooter>
      </Card>
    </div>
  )
}

export default function MyBidsPage() {
    return (
        <React.Suspense fallback={<div>Loading...</div>}>
            <MyBidsPageContent />
        </React.Suspense>
    )
}
