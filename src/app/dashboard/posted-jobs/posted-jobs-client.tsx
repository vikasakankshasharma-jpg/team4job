
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
import { PlusCircle, Loader2, RefreshCw, Star, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  TooltipProvider,
} from "@/components/ui/tooltip"
import { useSearchParams, useRouter } from "next/navigation";
import { Job } from "@/lib/types";
import { toDate, getRefId } from "@/lib/utils";
import { useUser, useAuth } from "@/hooks/use-user";
import { useState, useEffect } from "react";
import { useHelp } from "@/hooks/use-help";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Briefcase, Archive, Inbox } from "lucide-react";
import { StatusBadge } from "@/components/job-giver/status-badge";
import { EnhancedEmptyState } from "@/components/job-giver/enhanced-empty-state";
import { BulkActionsToolbar } from "@/components/posted-jobs/bulk-actions-toolbar";
import { AdvancedFilters, type JobFilters } from "@/components/posted-jobs/advanced-filters";
import { MobileJobCard } from "@/components/posted-jobs/mobile-job-card";
import { useMyJobs } from "@/hooks/use-my-jobs";

function PromoteJobDialog({ job, onJobPromoted }: { job: Job, onJobPromoted: () => void }) {
  const { user } = useUser();
  const auth = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [tip, setTip] = useState(0);
  const [newDeadline, setNewDeadline] = useState('');

  const handlePromote = async () => {
    if (!tip || tip <= 0 || !newDeadline) {
      toast({ title: "Invalid Input", description: "Please enter a valid tip amount and a new deadline.", variant: "destructive" });
      return;
    }

    if (!user) return;

    setIsLoading(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Not authenticated");
      const response = await fetch(`/api/jobs/${job.id}/promote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ travelTip: tip, deadline: newDeadline })
      });

      if (!response.ok) throw new Error('Failed to promote job');

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
          {/* Desktop: Table */}
          <div className="hidden md:block">
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
                    <TableCell colSpan={6} className="text-center h-24">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                      <span className="sr-only">Loading jobs...</span>
                    </TableCell>
                  </TableRow>
                ) : jobs.length > 0 ? jobs.map(job => (
                  <TableRow key={job.id}>
                    <TableCell className="font-medium">
                      <Link href={`/dashboard/jobs/${job.id}`} className="hover:underline">{job.title}</Link>
                      <p className="text-xs text-muted-foreground font-mono">{job.id}</p>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={job.status} showTooltip={false} size="sm" />
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
                    <TableCell colSpan={6} className="h-64 p-8">
                      <EnhancedEmptyState
                        icon={title.includes('Archived') ? Archive : title.includes('Unbid') ? Inbox : Briefcase}
                        title={title.includes('Active') ? "No active jobs yet" : title.includes('Unbid') ? "No unbid jobs" : "No archived jobs"}
                        description={
                          title.includes('Active')
                            ? "Start by creating your first job posting to find qualified installers."
                            : title.includes('Unbid')
                              ? "All your jobs have received bids. Great work!"
                              : "Completed and cancelled jobs will appear here."
                        }
                        action={
                          title.includes('Active') ? {
                            label: "Post Your First Job",
                            onClick: () => window.location.href = '/dashboard/post-job',
                            variant: 'default' as const
                          } : undefined
                        }
                        className="border-0 shadow-none"
                      />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile: Cards */}
          <div className="md:hidden space-y-4">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : jobs.length > 0 ? (
              jobs.map(job => (
                <MobileJobCard key={job.id} job={job} />
              ))
            ) : (
              <EnhancedEmptyState
                icon={Briefcase}
                title={title.includes('Active') ? "No active jobs" : title.includes('Unbid') ? "No unbid jobs" : "No jobs"}
                description={title.includes('Active') ? "Start by creating your first job posting." : "All jobs have received bids!"}
                action={title.includes('Active') ? { label: "Post Job", onClick: () => window.location.href = '/dashboard/post-job' } : undefined}
                className="border-0 shadow-none"
              />
            )}
          </div>
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

export default function PostedJobsClient({ initialJobs }: { initialJobs?: Job[] }) {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") || "active";
  const { user, role, loading: userLoading } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const { setHelp } = useHelp();
  const { toast } = useToast();

  // Use new hook with initial data
  // casting initialJobs to any to bypass potential type mismatch during refactor if any, ensuring Job[] match
  const { jobs, loading: jobsLoading, refetch } = useMyJobs(initialJobs);

  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);
  const [filters, setFilters] = useState<JobFilters>({});

  useEffect(() => {
    if (!userLoading && user && (user.roles.includes('Admin') || role === 'Installer')) {
      router.push('/dashboard');
    }
  }, [user, userLoading, router, role]);

  useEffect(() => {
    setHelp({
      title: 'My Posted Jobs Guide',
      content: (
        <div className="space-y-4 text-sm">
          <p>This page lists all the jobs you have created. It&apos;s split into three tabs:</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <span className="font-semibold">Active:</span> Shows all jobs that are currently open for bidding, in progress, or waiting for your action. This is where you&apos;ll manage ongoing projects.
            </li>
            <li>
              <span className="font-semibold">Unbid:</span> Jobs that received no bids. From here you can choose to repost the job as is, or promote it with a travel tip to attract more installers.
            </li>
            <li>
              <span className="font-semibold">Archived:</span> Shows all your jobs that have been completed or cancelled. This is your history of past jobs.
            </li>
            <li>
              <span className="font-semibold">Job Type:</span> This column shows how a job was awarded. &quot;Bidding&quot; means you chose from bids, while &quot;Direct&quot; means you awarded it directly to an installer.
            </li>
            <li>
              <span className="font-semibold">Actions:</span> Use the actions menu (three dots) on each job row to view its details, re-post a cancelled/un-bid job, or promote an un-bid job to a wider audience.
            </li>
          </ul>
          <p>
            Click on any job title to go to its detail page, where you can review bids from installers. You can also use the &quot;Post New Job&quot; button to quickly create a new listing.
          </p>
        </div>
      )
    });
  }, [setHelp]);

  const handleBulkAction = async (action: 'archive' | 'delete') => {
    if (selectedJobIds.length === 0 || !user) return;

    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Not authenticated");

      const response = await fetch('/api/jobs/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action, jobIds: selectedJobIds })
      });

      if (!response.ok) throw new Error(`Failed to ${action} jobs`);

      toast({ title: "Success", description: `${selectedJobIds.length} job(s) ${action}d.` });
      setSelectedJobIds([]);
      refetch();
    } catch (error) {
      console.error(`Bulk ${action} error:`, error);
      toast({ title: "Error", description: `Failed to ${action} jobs.`, variant: "destructive" });
    }
  };

  const handleBulkArchive = () => handleBulkAction('archive');
  const handleBulkDelete = () => handleBulkAction('delete');

  // Filter logic
  const applyFilters = (jobsList: Job[]) => {
    return jobsList.filter(job => {
      // Search filter
      if (filters.search && !job.title.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }

      // Budget filters - use priceEstimate if available
      if (filters.budgetMin || filters.budgetMax) {
        const jobBudget = job.priceEstimate?.max || job.priceEstimate?.min || 0;
        if (filters.budgetMin && jobBudget < filters.budgetMin) return false;
        if (filters.budgetMax && jobBudget > filters.budgetMax) return false;
      }

      // Category filter
      if (filters.category && job.jobCategory !== filters.category) return false;

      // Date filters
      if (filters.dateFrom) {
        const jobDate = toDate(job.postedAt);
        const fromDate = new Date(filters.dateFrom);
        if (jobDate < fromDate) return false;
      }
      if (filters.dateTo) {
        const jobDate = toDate(job.postedAt);
        const toDateFilter = new Date(filters.dateTo);
        if (jobDate > toDateFilter) return false;
      }

      // Installer filter
      if (filters.installer) {
        const awardedInstallerName = typeof job.awardedInstaller === 'object' && 'name' in job.awardedInstaller ? job.awardedInstaller.name : '';
        if (!awardedInstallerName || !awardedInstallerName.toLowerCase().includes(filters.installer.toLowerCase())) {
          return false;
        }
      }

      return true;
    });
  };

  if (userLoading || (!userLoading && role !== 'Job Giver')) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  // Use jobs from hook
  const activeJobs = applyFilters(jobs.filter(job => !['completed', 'cancelled', 'unbid'].includes(job.status.toLowerCase()))).sort((a, b) => toDate(b.postedAt).getTime() - toDate(a.postedAt).getTime());

  const unbidJobs = applyFilters(jobs.filter(job => job.status.toLowerCase() === 'unbid')).sort((a, b) => toDate(b.postedAt).getTime() - toDate(a.postedAt).getTime());
  const archivedJobs = applyFilters(jobs.filter(job => ['completed', 'cancelled'].includes(job.status.toLowerCase()))).sort((a, b) => toDate(b.postedAt).getTime() - toDate(a.postedAt).getTime());

  // Get categories for filter dropdown
  const categories = Array.from(new Set(jobs.map(j => j.jobCategory).filter(Boolean)));

  return (
    <>
      <Tabs defaultValue={tab} className="w-full">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
          <TabsList className="h-auto flex-wrap justify-start w-full sm:w-auto grid-cols-1 sm:grid-cols-3">
            <TabsTrigger value="active" className="flex-1 sm:flex-none">Active ({activeJobs.length})</TabsTrigger>
            <TabsTrigger value="unbid" className="flex-1 sm:flex-none">Unbid ({unbidJobs.length})</TabsTrigger>
            <TabsTrigger value="archived" className="flex-1 sm:flex-none">Archived ({archivedJobs.length})</TabsTrigger>
          </TabsList>
          <Button asChild>
            <Link href="/dashboard/post-job">
              <PlusCircle className="mr-2 h-4 w-4" />
              Post New Job
            </Link>
          </Button>
        </div>

        {/* Advanced Filters */}
        <div className="mb-4">
          <AdvancedFilters
            onFilterChange={setFilters}
            appliedFilters={filters}
            categories={categories}
          />
        </div>

        <TabsContent value="active">
          <PostedJobsTable
            jobs={activeJobs}
            title="My Active Jobs"
            description="Manage your job postings and review bids from installers."
            footerText={`You have ${activeJobs.length} active jobs.`}
            loading={jobsLoading}
            onUpdate={refetch}
          />
        </TabsContent>
        <TabsContent value="unbid">
          <PostedJobsTable
            jobs={unbidJobs}
            title="Unbid Jobs"
            description="Jobs that received no bids. You can repost or promote them."
            footerText={`You have ${unbidJobs.length} unbid jobs requiring attention.`}
            loading={jobsLoading}
            onUpdate={refetch}
          />
        </TabsContent>
        <TabsContent value="archived">
          <PostedJobsTable
            jobs={archivedJobs}
            title="My Archived Jobs"
            description="A history of your completed or cancelled projects."
            footerText={`You have ${archivedJobs.length} archived jobs.`}
            loading={jobsLoading}
            onUpdate={refetch}
          />
        </TabsContent>
      </Tabs>

      {/* Bulk Actions Toolbar */}
      <BulkActionsToolbar
        selectedCount={selectedJobIds.length}
        onArchive={handleBulkArchive}
        onDelete={handleBulkDelete}
        onClearSelection={() => setSelectedJobIds([])}
      />
    </>
  )
}
