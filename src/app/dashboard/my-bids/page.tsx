
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { jobs, users } from "@/lib/data";
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

export default function MyBidsPage() {
  // Assuming the logged in user is user-1 (Alex Johnson)
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
                <TableRow key={bid.id}>
                  <TableCell className="font-medium">
                    <Link href={`/dashboard/jobs/${bid.jobId}`} className="hover:underline">{bid.jobTitle}</Link>
                  </TableCell>
                  <TableCell>
                     <div className="flex items-center gap-1">
                        <IndianRupee className="h-4 w-4 text-muted-foreground" />
                        {bid.amount.toLocaleString()}
                     </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{formatDistanceToNow(bid.timestamp, { addSuffix: true })}</TableCell>
                  <TableCell>
                      <Badge variant="outline">{bid.jobStatus}</Badge>
                  </TableCell>
                   <TableCell>
                      <Badge variant={jobs.find(j => j.id === bid.jobId)?.awardedInstaller === installerId ? "default" : "secondary"}>
                        {jobs.find(j => j.id === bid.jobId)?.awardedInstaller === installerId ? "Won" : "Pending"}
                      </Badge>
                  </TableCell>
                </TableRow>
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
