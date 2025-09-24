
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
import { format, formatDistanceToNow } from "date-fns";
import { IndianRupee } from "lucide-react";
import { Job, Bid } from "@/lib/types";
import React from "react";


const getStatusVariant = (status: Job['status']): "default" | "secondary" | "success" | "warning" | "info" | "destructive" | "outline" | null | undefined => {
    switch (status) {
        case 'Open for Bidding':
            return 'success';
        case 'Bidding Closed':
            return 'warning';
        case 'Awarded':
        case 'In Progress':
            return 'info';
        case 'Completed':
            return 'secondary';
        default:
            return 'default';
    }
}

type MyBidRowProps = {
  bid: Bid & { jobTitle: string; jobId: string; jobStatus: Job['status'] };
}

function MyBidRow({ bid }: MyBidRowProps) {
    const [timeAgo, setTimeAgo] = React.useState('');
    const installerId = 'user-1';

    React.useEffect(() => {
        if (bid.timestamp) {
            setTimeAgo(formatDistanceToNow(new Date(bid.timestamp), { addSuffix: true }));
        }
    }, [bid.timestamp]);

    const job = jobs.find(j => j.id === bid.jobId);

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
                <Badge variant={job?.awardedInstaller === installerId ? "success" : "secondary"}>
                    {job?.awardedInstaller === installerId ? "Won" : "Pending"}
                </Badge>
            </TableCell>
        </TableRow>
    );
}

export default function MyBidsPage() {
  const installerId = 'user-1';
  const myBids = jobs.flatMap(job => 
    job.bids.filter(bid => bid.installer.id === installerId)
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {myBids.map(bid => (
                <MyBidRow key={bid.id} bid={bid} />
              ))}
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
