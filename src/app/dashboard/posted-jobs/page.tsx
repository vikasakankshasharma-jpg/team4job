
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
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Loader2, RefreshCw, Star } from "lucide-react";
import Link from "next/link";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { MoreHorizontal } from "lucide-react"
import { useSearchParams, useRouter } from "next/navigation";
import { Job, User } from "@/lib/types";
import { getStatusVariant, toDate } from "@/lib/utils";
import { useUser, useFirebase } from "@/hooks/use-user";
import React from "react";
import { useHelp } from "@/hooks/use-help";
import { collection, getDocs, query, where, doc, getDoc, updateDoc } from "firebase/firestore";
import type { DocumentReference } from "firebase/firestore";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";


const getRefId = (ref: any): string | null => {
  if (!ref) return null;
  if (typeof ref === 'string') return ref;
  return ref.id || null;
}

const statusDescriptions: Record<string, string> = {
  "Open for Bidding": "The job is live and installers can place bids.",
  "Bidding Closed": "The bidding deadline has passed. You can now review bids and award the job.",
  "Awarded": "You have awarded the job to an installer. Waiting for them to accept.",
  "In Progress": "The installer has accepted the job and work is underway.",
  "Completed": "The job has been successfully completed and paid for.",
  "Cancelled": "This job has been cancelled.",
  "Unbid": "The bidding deadline passed with no bids received.",
  "Pending Funding": "The installer has accepted; awaiting your payment to start the job."
};

function PromoteJobDialog({ job, onJobPromoted }: { job: Job, onJobPromoted: () => void }) {
  const { db } = useFirebase();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [tip, setTip] = React.useState(0);
  const [newDeadline, setNewDeadline] = React.useState('');

  const handlePromote = async () => {
    if (!tip || tip <= 0 || !newDeadline) {
      toast({ title: "Invalid Input", description: "Please enter a valid tip amount and a new deadline.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const jobRef = doc(db, 'jobs', job.id);
      await updateDoc(jobRef, {
        travelTip: tip,
        deadline: new Date(newDeadline),
        status: 'Open for Bidding',
      });
      toast({ title: "Job Promoted!", description: "Your job is now open for bidding to a wider audience.", variant: "default" });
      onJobPromoted();
      setIsOpen(false);
    } catch (error) {
      console.error("Error promoting job:", error);
      toast({ title: "Error", description: "Could not promote the job. Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-primary focus:bg-primary/10 focus:text-primary">
          <Star className="mr-2 h-4 w-4" />
          Promote & Re-list
        </DropdownMenuItem>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Promote Unbid Job</DialogTitle>
          <DialogDescription>
            Attract more installers by offering a travel tip and re-listing the job. This tip is commission-free for the installer.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="tip-amount">Travel Tip (₹)</Label>
            <Input
              id="tip-amount"
              type="number"
              placeholder="e.g., 500"
              value={tip}
              onChange={(e) => setTip(Number(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">This amount will be added to the total cost and paid directly to the installer.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-deadline">New Bidding Deadline</Label>
            <Input
              id="new-deadline"
              type="date"
              value={newDeadline}
              onChange={(e) => setNewDeadline(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={isLoading}>Cancel</Button>
          </DialogClose>
          <Button onClick={handlePromote} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Promote & Re-list Job
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function PostedJobsTable({ jobs, title, description, footerText, loading, onUpdate }: { jobs: Job[], title: string, description: string, footerText: string, loading: boolean, onUpdate: () => void }) {

  const getJobType = (job: Job) => {
    if (!job.awardedInstaller) return 'N/A';

    const awardedInstallerId = getRefId(job.awardedInstaller);

    if (!job.bids || job.bids.length === 0) {
      if (awardedInstallerId) return 'Direct';
      return 'N/A';
    }

    const bidderIds = (job.bids || []).map(b => getRefId(b.installer));

    return bidderIds.includes(awardedInstallerId) ? 'Bidding' : 'Direct';
  };

  const getActionsForJob = (job: Job) => {
    const actions = [
      <DropdownMenuItem key="view" asChild><Link href={`/dashboard/jobs/${job.id}`}>View Details</Link></DropdownMenuItem>
    ];

    if (job.status === 'Unbid' || job.status === 'Cancelled') {
      actions.push(<DropdownMenuItem key="repost" asChild><Link href={`/dashboard/post-job?repostJobId=${job.id}`}><RefreshCw className="mr-2 h-4 w-4" />Repost Job</Link></DropdownMenuItem>);
    }

    if (job.status === 'Unbid') {
      actions.push(<PromoteJobDialog key="promote" job={job} onJobPromoted={onUpdate} />);
    }

    return actions;
  }

  return (
    <TooltipProvider>
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
                <TableHead className="hidden md:table-cell">Job Type</TableHead>
                <TableHead className="hidden md:table-cell">Posted On</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-24"><Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" /></TableCell>
                </TableRow>
              ) : jobs.length > 0 ? jobs.map(job => (
                <TableRow key={job.id}>
                  <TableCell className="font-medium">
                    <Link href={`/dashboard/jobs/${job.id}`} className="hover:underline">{job.title}</Link>
                    <p className="text-xs text-muted-foreground font-mono">{job.id}</p>
                  </TableCell>
                  <TableCell>
                    <Tooltip>
                      <TooltipTrigger>
                        <Badge variant={getStatusVariant(job.status)}>{job.status}</Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{statusDescriptions[job.status]}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{(job.bids || []).length}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    {getJobType(job)}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{format(toDate(job.postedAt), "MMM d, yyyy")}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Toggle menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        {getActionsForJob(job)}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-24">You haven't posted any jobs in this category.</TableCell>
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
    </TooltipProvider >
  )
}

export default function PostedJobsPage() {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") || "active";
  const { user, role, loading: userLoading } = useUser();
  const { db } = useFirebase();
  const router = useRouter();
  const { setHelp } = useHelp();
  const [jobs, setJobs] = React.useState<Job[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!userLoading && user && (user.roles.includes('Admin') || role === 'Installer')) {
      router.push('/dashboard');
    }
  }, [user, userLoading, router, role]);

  const fetchJobs = React.useCallback(async () => {
    if (!db || !user || role !== 'Job Giver') {
      setLoading(false);
      return;
    };

    setLoading(true);
    const userJobsQuery = query(collection(db, 'jobs'), where('jobGiver', '==', doc(db, 'users', user.id)));
    const jobSnapshot = await getDocs(userJobsQuery);

    const jobsData = jobSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Job));

    const userRefs = new Map<string, DocumentReference>();
    jobsData.forEach(job => {
      const awardedInstallerId = getRefId(job.awardedInstaller);
      if (awardedInstallerId) userRefs.set(awardedInstallerId, doc(db, 'users', awardedInstallerId));

      (job.bids || []).forEach(bid => {
        const installerId = getRefId(bid.installer);
        if (installerId) userRefs.set(installerId, doc(db, 'users', installerId));
      });
    });

    const usersMap = new Map<string, User>();
    if (userRefs.size > 0) {
      const userRefArray = Array.from(userRefs.keys());
      for (let i = 0; i < userRefArray.length; i += 30) {
        const chunk = userRefArray.slice(i, i + 30);
        if (chunk.length > 0) {
          const usersQuery = query(collection(db, 'users'), where('__name__', 'in', chunk));
          const userDocs = await getDocs(usersQuery);
          userDocs.forEach(docSnap => {
            if (docSnap.exists()) {
              usersMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() } as User);
            }
          });
        }
      }
    }

    const populatedJobs = jobsData.map(job => {
      const awardedInstallerId = getRefId(job.awardedInstaller);
      return {
        ...job,
        awardedInstaller: awardedInstallerId ? usersMap.get(awardedInstallerId) || job.awardedInstaller : undefined,
        bids: (job.bids || []).map(bid => {
          const installerId = getRefId(bid.installer);
          return {
            ...bid,
            installer: installerId ? usersMap.get(installerId) || bid.installer : bid.installer,
          }
        }),
      };
    });

    setJobs(populatedJobs);
    setLoading(false);
  }, [user, role, db]);

  React.useEffect(() => {
    if (!userLoading && db && user) {
      fetchJobs();
    }
  }, [userLoading, db, user, fetchJobs]);

  React.useEffect(() => {
    setHelp({
      title: 'My Posted Jobs Guide',
      content: (
        <div className="space-y-4 text-sm">
          <p>This page lists all the jobs you have created. It's split into three tabs:</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <span className="font-semibold">Active:</span> Shows all jobs that are currently open for bidding, in progress, or waiting for your action. This is where you'll manage ongoing projects.
            </li>
            <li>
              <span className="font-semibold">Unbid:</span> Jobs that received no bids. From here you can choose to repost the job as is, or promote it with a travel tip to attract more installers.
            </li>
            <li>
              <span className="font-semibold">Archived:</span> Shows all your jobs that have been completed or cancelled. This is your history of past jobs.
            </li>
            <li>
              <span className="font-semibold">Job Type:</span> This column shows how a job was awarded. "Bidding" means you chose from bids, while "Direct" means you awarded it directly to an installer.
            </li>
            <li>
              <span className="font-semibold">Actions:</span> Use the actions menu (three dots) on each job row to view its details, re-post a cancelled/un-bid job, or promote an un-bid job to a wider audience.
            </li>
          </ul>
          <p>
            Click on any job title to go to its detail page, where you can review bids from installers. You can also use the "Post New Job" button to quickly create a new listing.
          </p>
        </div>
      )
    });
  }, [setHelp]);

  if (userLoading || (!userLoading && role !== 'Job Giver')) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const activeJobs = jobs.filter(job => !['Completed', 'Cancelled', 'Unbid'].includes(job.status)).sort((a, b) => toDate(b.postedAt).getTime() - toDate(a.postedAt).getTime());
  const unbidJobs = jobs.filter(job => job.status === 'Unbid').sort((a, b) => toDate(b.postedAt).getTime() - toDate(a.postedAt).getTime());
  const archivedJobs = jobs.filter(job => job.status === 'Completed' || job.status === 'Cancelled').sort((a, b) => toDate(b.postedAt).getTime() - toDate(a.postedAt).getTime());

  const pageTitle = tab === 'active' ? `My Active Jobs (${activeJobs.length})` : tab === 'unbid' ? `Unbid Jobs (${unbidJobs.length})` : `Archived Jobs (${archivedJobs.length})`;

  return (
    <Tabs defaultValue={tab} className="w-full">
      <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="active">Active ({activeJobs.length})</TabsTrigger>
          <TabsTrigger value="unbid">Unbid ({unbidJobs.length})</TabsTrigger>
          <TabsTrigger value="archived">Archived ({archivedJobs.length})</TabsTrigger>
        </TabsList>
        <Button asChild>
          <Link href="/dashboard/post-job">
            <PlusCircle className="mr-2 h-4 w-4" />
            Post New Job
          </Link>
        </Button>
      </div>
      <TabsContent value="active">
        <PostedJobsTable
          jobs={activeJobs}
          title="My Active Jobs"
          description="Manage your job postings and review bids from installers."
          footerText={`You have ${activeJobs.length} active jobs.`}
          loading={loading}
          onUpdate={fetchJobs}
        />
      </TabsContent>
      <TabsContent value="unbid">
        <PostedJobsTable
          jobs={unbidJobs}
          title="Unbid Jobs"
          description="Jobs that received no bids. You can repost or promote them."
          footerText={`You have ${unbidJobs.length} unbid jobs requiring attention.`}
          loading={loading}
          onUpdate={fetchJobs}
        />
      </TabsContent>
      <TabsContent value="archived">
        <PostedJobsTable
          jobs={archivedJobs}
          title="My Archived Jobs"
          description="A history of your completed or cancelled projects."
          footerText={`You have ${archivedJobs.length} archived jobs.`}
          loading={loading}
          onUpdate={fetchJobs}
        />
      </TabsContent>
    </Tabs>
  )
}

