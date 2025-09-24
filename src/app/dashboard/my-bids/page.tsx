
"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card";
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
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Award, IndianRupee } from "lucide-react";
import { Job, Bid } from "@/lib/types";
import React from "react";
import { getStatusVariant } from "@/lib/utils";
import { useUser } from "@/hooks/use-user";


type MyBidRowProps = {
  bid: Bid & { jobTitle: string; jobId: string; jobStatus: Job['status'] };
}

function MyBidRow({ bid }: MyBidRowProps) {
    const [timeAgo, setTimeAgo] = React.useState('');
    const { user } = useUser();

    React.useEffect(() => {
        if (bid.timestamp) {
            setTimeAgo(formatDistanceToNow(new Date(bid.timestamp), { addSuffix: true }));
        }
    }, [bid.timestamp]);

    const job = jobs.find(j => j.id === bid.jobId);
    
    const getMyBidStatus = (): { text: string; variant: "default" | "secondary" | "success" | "warning" | "info" | "destructive" | "outline" | null | undefined } => {
        if (!job || !user) return { text: "Unknown", variant: "secondary" };

        const won = job.awardedInstaller === user.id;

        if (won) {
            if (job.status === 'Completed') return { text: 'Completed', variant: 'secondary' };
            if (job.status === 'In Progress') return { text: 'In Progress', variant: 'info' };
            if (job.status === 'Awarded') return { text: 'Awarded', variant: 'success' };
        }

        if (job.status === 'Open for Bidding') return { text: 'Bidded', variant: 'default' };

        if (job.status === 'Bidding Closed' || job.status === 'Awarded' || job.status === 'In Progress' || job.status === 'Completed') {
            if (!won) return { text: 'Not Selected', variant: 'destructive' };
        }
        
        return { text: job.status, variant: getStatusVariant(job.status) };
    }
    
    const calculatePoints = () => {
        if (!job || job.status !== 'Completed' || job.awardedInstaller !== user?.id) {
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
                <div className="flex items-center gap-1">
                    <IndianRupee className="h-4 w-4" />
                    {bid.amount.toLocaleString()}
                </div>
            </TableCell>
            <TableCell className="hidden md:table-cell">{timeAgo}</TableCell>
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

export default function MyBidsPage() {
  const { user } = useUser();
  
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
          <p>Please log in to see your bids.</p>
        </CardContent>
      </Card>
    );
  }

  const myBids = jobs.flatMap(job => 
    job.bids.filter(bid => bid.installer.id === user.id)
    .map(bid => ({ ...bid, jobTitle: job.title, jobId: job.id, jobStatus: job.status }))
  );

  return (
    <div className="grid flex-1 items-start gap-4 md:gap-8">
      <Card>
        <CardHeader>
          <CardTitle>My Bids</CardTitle>
          <CardDescription>
            A history of all the bids you have placed.
          </CardDescription>
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
              {myBids.map(bid => (
                <MyBidRow key={bid.id} bid={bid} />
              ))}
               {myBids.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-24">You haven't placed any bids yet.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter>
            <div className="text-xs text-muted-foreground">
                Showing <strong>{myBids.length}</strong> of <strong>{myBids.length}</strong> bids
            </div>
        </CardFooter>
      </Card>
    </div>
  )
}
