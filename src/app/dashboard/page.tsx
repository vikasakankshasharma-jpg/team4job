
"use client";

import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Briefcase,
  Target,
  FileText,
  PlusCircle,
  ArrowRight,
  UserCheck,
  Users,
  IndianRupee,
} from "lucide-react";
import Link from "next/link";
import { useHelp } from "@/hooks/use-help";
import React from "react";
import { Job, User } from "@/lib/types";
import { jobs as allMockJobs, users as allMockUsers } from "@/lib/data";

function InstallerDashboard() {
  const { user } = useUser();
  const { setHelp } = useHelp();
  const [stats, setStats] = React.useState({ openJobs: 0, myBids: 0, jobsWon: 0 });

  React.useEffect(() => {
    if (!user) return;
    
    const openJobs = allMockJobs.filter(j => j.status === 'Open for Bidding').length;
    
    let myBidsCount = 0;
    let jobsWonCount = 0;

    allMockJobs.forEach(job => {
        const userHasBid = job.bids.some(bid => (bid.installer as User).id === user.id);
        const awardedId = typeof job.awardedInstaller === 'string' ? job.awardedInstaller : (job.awardedInstaller as User)?.id;
        const userIsAwarded = awardedId === user.id;

        if (userHasBid || userIsAwarded) {
            myBidsCount++;
        }
        if (userIsAwarded && (job.status === 'Awarded' || job.status === 'In Progress')) {
            jobsWonCount++;
        }
    });

    setStats({ openJobs, myBids: myBidsCount, jobsWon: jobsWonCount });
  }, [user]);

  React.useEffect(() => {
    setHelp({
        title: 'Installer Dashboard Guide',
        content: (
            <div className="space-y-4 text-sm">
                <p>Welcome to your Dashboard! This is your central hub for managing your work on the platform.</p>
                <ul className="list-disc space-y-2 pl-5">
                    <li>
                        <span className="font-semibold">Open Jobs:</span> This shows the total number of jobs currently available for bidding. Click it to find your next opportunity.
                    </li>
                    <li>
                        <span className="font-semibold">My Bids:</span> Tracks all the jobs you've bid on and their current status (Bidded, Awarded, etc.). Click to see your bidding history.
                    </li>
                    <li>
                        <span className="font-semibold">Jobs Won:</span> Displays the number of jobs you've won that are currently active or in progress.
                    </li>
                    <li>
                        <span className="font-semibold">Find Your Next Project:</span> A quick link to jump directly to the job browsing page.
                    </li>
                </ul>
                <p>Use the navigation on the left to access other sections like your Profile, where you can track your reputation and skills.</p>
            </div>
        )
    });
  }, [setHelp]);


  if (!user) return null; // Can add a skeleton loader here later

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-3">
        <Card>
          <Link href="/dashboard/jobs">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Open Jobs</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.openJobs}</div>
              <p className="text-xs text-muted-foreground">
                Jobs currently accepting bids
              </p>
            </CardContent>
          </Link>
        </Card>
        <Card>
          <Link href="/dashboard/my-bids">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">My Bids</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">+{stats.myBids}</div>
              <p className="text-xs text-muted-foreground">
                Your bids and awarded jobs
              </p>
            </CardContent>
          </Link>
        </Card>
        <Card>
           <Link href="/dashboard/my-bids?status=Awarded">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Jobs Won</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">+{stats.jobsWon}</div>
              <p className="text-xs text-muted-foreground">
                Active jobs awarded to you
              </p>
            </CardContent>
          </Link>
        </Card>
      </div>
      <div className="grid gap-4 md:gap-8 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Find Your Next Project</CardTitle>
            <CardDescription>
              Browse hundreds of CCTV installation jobs and place your bid.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/dashboard/jobs">
                Browse Jobs <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function JobGiverDashboard() {
  const { user } = useUser();
  const { setHelp } = useHelp();
  const [stats, setStats] = React.useState({ activeJobs: 0, completedJobs: 0, totalBids: 0 });

  React.useEffect(() => {
    if (!user) return;
    
    let active = 0;
    let completed = 0;
    let bids = 0;

    allMockJobs.forEach(job => {
        if ((job.jobGiver as User).id === user.id) {
            if (job.status !== 'Completed') {
                active++;
            } else {
                completed++;
            }
            bids += job.bids.length;
        }
    });

    setStats({ activeJobs: active, completedJobs: completed, totalBids: bids });
  }, [user]);

  React.useEffect(() => {
    setHelp({
        title: 'Job Giver Dashboard Guide',
        content: (
            <div className="space-y-4 text-sm">
                <p>Welcome to your Dashboard! This is your control center for hiring and managing installers.</p>
                <ul className="list-disc space-y-2 pl-5">
                    <li>
                        <span className="font-semibold">Active Jobs:</span> This shows the number of jobs you've posted that are currently open for bidding or in progress. Click to manage them.
                    </li>
                    <li>
                        <span className="font-semibold">Total Bids Received:</span> See the total number of bids submitted across all your job postings.
                    </li>
                    <li>
                        <span className="font-semibold">Completed Jobs:</span> View a history of all your successfully completed projects. Click to see your archived jobs.
                    </li>
                    <li>
                        <span className="font-semibold">Need an Installer?:</span> A shortcut to post a new job and start receiving bids from professionals.
                    </li>
                </ul>
                <p>Use the navigation on the left to access other sections, like "My Jobs" to review bids on your active postings.</p>
            </div>
        )
    });
  }, [setHelp]);

  if (!user) return null;
  
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-3">
        <Card>
          <Link href="/dashboard/posted-jobs">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeJobs}</div>
              <p className="text-xs text-muted-foreground">
                Jobs not yet completed
              </p>
            </CardContent>
          </Link>
        </Card>
        <Card>
           <Link href="/dashboard/posted-jobs">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Bids Received</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalBids}</div>
              <p className="text-xs text-muted-foreground">
                Across all your job postings
              </p>
            </CardContent>
          </Link>
        </Card>
        <Card>
           <Link href="/dashboard/posted-jobs?tab=archived">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed Jobs</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">+{stats.completedJobs}</div>
              <p className="text-xs text-muted-foreground">
                Successfully finished projects
              </p>
            </CardContent>
          </Link>
        </Card>
      </div>
      <div className="grid gap-4 md:gap-8 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Need an Installer?</CardTitle>
            <CardDescription>
              Post a job and get bids from verified CCTV professionals.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/dashboard/post-job">
                <PlusCircle className="mr-2 h-4 w-4" /> Post a New Job
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function AdminDashboard() {
  const { setHelp } = useHelp();
  const [stats, setStats] = React.useState({ totalUsers: 0, totalJobs: 0, totalBids: 0, completedJobValue: 0 });

  React.useEffect(() => {
    const totalUsers = allMockUsers.length;
    const totalJobs = allMockJobs.length;
    let totalBids = 0;
    let completedValue = 0;

    allMockJobs.forEach(job => {
        totalBids += job.bids?.length || 0;
        if (job.status === 'Completed' && job.awardedInstaller) {
            const awardedId = typeof job.awardedInstaller === 'string' ? job.awardedInstaller : (job.awardedInstaller as User).id;
            const winningBid = job.bids.find(bid => (bid.installer as User).id === awardedId);
            if (winningBid) {
                completedValue += winningBid.amount;
            }
        }
    });

    setStats({ totalUsers, totalJobs, totalBids, completedJobValue: completedValue });
  }, []);

  React.useEffect(() => {
    setHelp({
      title: 'Admin Dashboard Guide',
      content: (
        <div className="space-y-4 text-sm">
          <p>Welcome, Admin! This is your high-level overview of the entire platform.</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <span className="font-semibold">Total Users:</span> The total number of registered users (Installers and Job Givers).
            </li>
            <li>
              <span className="font-semibold">Total Jobs:</span> The total number of jobs ever created on the platform.
            </li>
            <li>
              <span className="font-semibold">Total Bids:</span> The sum of all bids placed across all jobs.
            </li>
            <li>
              <span className="font-semibold">Completed Job Value:</span> The total monetary value of all successfully completed jobs.
            </li>
          </ul>
          <p>Use the navigation menu to access detailed views like the User Directory.</p>
        </div>
      )
    });
  }, [setHelp]);

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
        <Card>
          <Link href="/dashboard/users">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                Installers & Job Givers
              </p>
            </CardContent>
          </Link>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalJobs}</div>
            <p className="text-xs text-muted-foreground">
              Jobs posted on the platform
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bids</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalBids}</div>
            <p className="text-xs text-muted-foreground">
              Bids placed on all jobs
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Job Value</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{stats.completedJobValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Value of all completed jobs
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}


export default function DashboardPage() {
  const { user, role } = useUser();

  if (!user) {
    return <div>Loading...</div>; // Or a spinner
  }

  const isAdmin = role === "Admin";

  return (
    <>
      <div className="flex items-center">
        <h1 className="text-lg font-semibold md:text-2xl">{isAdmin ? 'Admin Dashboard' : 'Dashboard'}</h1>
      </div>
      {isAdmin ? <AdminDashboard /> : (role === "Installer" ? <InstallerDashboard /> : <JobGiverDashboard />)}
    </>
  );
}
