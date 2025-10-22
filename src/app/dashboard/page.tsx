
"use client";

import { useUser, useFirebase } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Target,
  FileText,
  PlusCircle,
  ArrowRight,
  UserCheck,
  Users,
  IndianRupee,
  AlertOctagon,
  Loader2,
  ShieldCheck,
  Briefcase
} from "lucide-react";
import Link from "next/link";
import { useHelp } from "@/hooks/use-help";
import React from "react";
import { Job, User, Dispute } from "@/lib/types";
import { collection, query, where, getDocs, or, and, doc, getDoc } from "firebase/firestore";
import { DocumentReference } from "firebase/firestore";
import { cn } from "@/lib/utils";

const StatCard = ({ title, value, description, icon: Icon, href, iconBgColor, iconColor }) => (
    <Link href={href} className="block hover:shadow-lg transition-shadow duration-300 rounded-lg">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <div className={cn("p-2 rounded-full", iconBgColor)}>
                    <Icon className={cn("h-4 w-4", iconColor)} />
                </div>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                {description && <p className="text-xs text-muted-foreground">{description}</p>}
            </CardContent>
        </Card>
    </Link>
);


function InstallerDashboard() {
  const { user } = useUser();
  const { db } = useFirebase();
  const { setHelp } = useHelp();
  const [stats, setStats] = React.useState({ openJobs: 0, myBids: 0, jobsWon: 0 });
  const [loading, setLoading] = React.useState(true);

  const isVerified = user?.installerProfile?.verified;

  React.useEffect(() => {
    async function fetchData() {
        if (!user || !db) return;
        
        setLoading(true);
        const jobsRef = collection(db, "jobs");
        const openJobsQuery = query(jobsRef, where('status', '==', 'Open for Bidding'));
        const installerDocRef = doc(db, 'users', user.id);

        const myBidsQuery = query(jobsRef, where('bidderIds', 'array-contains', user.id));
        const myAwardedQuery = query(jobsRef, where('awardedInstaller', '==', installerDocRef));

        const [openJobsSnapshot, myBidsSnapshot, myAwardedSnapshot] = await Promise.all([
            getDocs(openJobsQuery),
            getDocs(myBidsQuery),
            getDocs(myAwardedQuery)
        ]);

        const myJobsSet = new Set([...myBidsSnapshot.docs.map(d => d.id), ...myAwardedSnapshot.docs.map(d => d.id)]);

        setStats({
            openJobs: openJobsSnapshot.size,
            myBids: myJobsSet.size,
            jobsWon: myAwardedSnapshot.size
        });

        setLoading(false);
    }
    
    fetchData();
    
  }, [user, db]);


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
                     {!isVerified && (
                         <li>
                            <span className="font-semibold">Verification:</span> Complete your Aadhar verification to become a trusted installer and increase your chances of winning jobs.
                        </li>
                    )}
                    <li>
                        <span className="font-semibold">Find Your Next Project:</span> A quick link to jump directly to the job browsing page.
                    </li>
                </ul>
                <p>Use the navigation on the left to access other sections like your Profile, where you can track your reputation and skills.</p>
            </div>
        )
    });
  }, [setHelp, isVerified]);

  if (loading) {
      return (
        <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )
  }

  return (
    <>
     <div className="flex items-center mb-8">
        <h1 className="text-lg font-semibold md:text-2xl">Welcome, {user?.name}!</h1>
      </div>
     {!isVerified && (
        <Card className="mb-8 bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800">
          <CardHeader className="flex-row items-center gap-4 space-y-0">
             <div className="p-3 rounded-full bg-yellow-100 dark:bg-yellow-900">
                <ShieldCheck className="h-6 w-6 text-yellow-600 dark:text-yellow-300" />
             </div>
             <div>
                <CardTitle>Become a Verified Installer</CardTitle>
                <CardDescription>Complete Aadhar verification to build trust and get more jobs.</CardDescription>
             </div>
          </CardHeader>
          <CardContent>
            <Button asChild>
                <Link href="/dashboard/verify-installer">
                    Verify Now <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-3">
        <StatCard 
            title="Open Jobs"
            value={stats.openJobs}
            description="Jobs currently accepting bids"
            icon={Briefcase}
            href="/dashboard/jobs"
            iconBgColor="bg-blue-100 dark:bg-blue-900"
            iconColor="text-blue-600 dark:text-blue-300"
        />
        <StatCard 
            title="My Bids"
            value={stats.myBids}
            description="Your bids and awarded jobs"
            icon={Target}
            href="/dashboard/my-bids"
            iconBgColor="bg-purple-100 dark:bg-purple-900"
            iconColor="text-purple-600 dark:text-purple-300"
        />
        <StatCard 
            title="Jobs Won"
            value={stats.jobsWon}
            description="Total jobs awarded to you"
            icon={UserCheck}
            href="/dashboard/my-bids?status=Awarded"
            iconBgColor="bg-green-100 dark:bg-green-900"
            iconColor="text-green-600 dark:text-green-300"
        />
    </div>
      <div className="mt-8 grid gap-4 md:gap-8 lg:grid-cols-2">
        <Card data-tour="find-project-card">
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
        <Card data-tour="manage-profile-card">
          <CardHeader>
            <CardTitle>Manage Your Profile</CardTitle>
            <CardDescription>
                Keep your skills and reputation up-to-date to attract more Job Givers.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="secondary">
                <Link href="/dashboard/profile">
                    Go to Profile <ArrowRight className="ml-2 h-4 w-4" />
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
  const { db } = useFirebase();
  const { setHelp } = useHelp();
  const [stats, setStats] = React.useState({ activeJobs: 0, completedJobs: 0, totalBids: 0, openDisputes: 0 });
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function fetchData() {
        if (!user || !db) return;
        setLoading(true);

        const userDocRef = doc(db, 'users', user.id);

        const myJobsQuery = query(collection(db, "jobs"), where('jobGiver', '==', userDocRef));
        
        const disputesQuery = query(
            collection(db, "disputes"),
            and(
                where('status', '==', 'Open'),
                or(
                    where('parties.jobGiverId', '==', user.id),
                    where('parties.installerId', '==', user.id)
                )
            )
        );

        const [myJobsSnapshot, disputesSnapshot] = await Promise.all([
            getDocs(myJobsQuery),
            getDocs(disputesQuery)
        ]);

        const myJobs = myJobsSnapshot.docs.map(doc => doc.data() as Job);

        let active = 0;
        let completed = 0;
        let bids = 0;

        myJobs.forEach(job => {
            if (job.status !== 'Completed' && job.status !== 'Cancelled') {
                active++;
            }
            if (job.status === 'Completed') {
                completed++;
            }
            bids += (job.bids || []).length;
        });
        
        setStats({ 
            activeJobs: active, 
            completedJobs: completed, 
            totalBids: bids,
            openDisputes: disputesSnapshot.size 
        });

        setLoading(false);
    }
    
    fetchData();
    
  }, [user, db]);

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
                        <span className="font-semibold">Open Disputes:</span> Shows any active disputes on your jobs that require your attention.
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

  if (loading) {
      return (
        <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )
  }
  
  return (
    <>
     <div className="flex items-center mb-8">
        <h1 className="text-lg font-semibold md:text-2xl">Welcome, {user?.name}!</h1>
      </div>
      <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
         <StatCard 
            title="Active Jobs"
            value={stats.activeJobs}
            description="Jobs not yet completed"
            icon={Briefcase}
            href="/dashboard/posted-jobs"
            iconBgColor="bg-blue-100 dark:bg-blue-900"
            iconColor="text-blue-600 dark:text-blue-300"
        />
        <StatCard 
            title="Total Bids Received"
            value={stats.totalBids}
            description="Across all your job postings"
            icon={FileText}
            href="/dashboard/posted-jobs"
            iconBgColor="bg-purple-100 dark:bg-purple-900"
            iconColor="text-purple-600 dark:text-purple-300"
        />
        <StatCard 
            title="Completed Jobs"
            value={stats.completedJobs}
            description="Successfully finished projects"
            icon={UserCheck}
            href="/dashboard/posted-jobs?tab=archived"
            iconBgColor="bg-green-100 dark:bg-green-900"
            iconColor="text-green-600 dark:text-green-300"
        />
        <StatCard 
            title="Open Disputes"
            value={stats.openDisputes}
            description="Disputes needing resolution"
            icon={AlertOctagon}
            href="/dashboard/disputes"
            iconBgColor="bg-red-100 dark:bg-red-900"
            iconColor="text-red-600 dark:text-red-300"
        />
      </div>
      <div className="mt-8 grid grid-cols-1 gap-4 md:gap-8 lg:grid-cols-2">
        <Card data-tour="need-installer-card" className="col-span-1">
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
        <Card data-tour="manage-jobs-card" className="col-span-1">
          <CardHeader>
            <CardTitle>Manage Your Jobs</CardTitle>
            <CardDescription>
                Review bids, award projects, and manage your active jobs all in one place.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="secondary">
                <Link href="/dashboard/posted-jobs">
                    Go to My Jobs <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function AdminDashboard() {
  const { user } = useUser();
  const { db } = useFirebase();
  const { setHelp } = useHelp();
  const [stats, setStats] = React.useState({ totalUsers: 0, totalJobs: 0, openDisputes: 0, completedJobValue: 0 });
  const [loading, setLoading] = React.useState(true);
  
  React.useEffect(() => {
    async function fetchData() {
        if (!user || !db) return;
        setLoading(true);
        
        const usersQuery = query(collection(db, "users"));
        const jobsQuery = query(collection(db, "jobs"));
        const disputesQuery = query(collection(db, "disputes"), where('status', '==', 'Open'));

        const [usersSnapshot, jobsSnapshot, disputesSnapshot] = await Promise.all([
          getDocs(usersQuery),
          getDocs(jobsQuery),
          getDocs(disputesQuery)
        ]);

        const allJobs = jobsSnapshot.docs.map(d => d.data() as Job);
        
        let completedJobValue = 0;
        allJobs.forEach(job => {
            if (job.status === 'Completed' && job.awardedInstaller) {
                const winningBid = (job.bids || []).find(bid => ((bid.installer as DocumentReference)?.id) === (job.awardedInstaller as DocumentReference)?.id);
                if (winningBid) {
                    completedJobValue += winningBid.amount;
                }
            }
        });

        setStats({
            totalUsers: usersSnapshot.size,
            totalJobs: jobsSnapshot.size,
            openDisputes: disputesSnapshot.size,
            completedJobValue
        });

        setLoading(false);
    }

    fetchData();
    
  }, [user, db]);

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
              <span className="font-semibold">Open Disputes:</span> The number of active disputes requiring your attention.
            </li>
            <li>
              <span className="font-semibold">Completed Job Value:</span> The total monetary value of all successfully completed jobs.
            </li>
          </ul>
          <p>Use the navigation menu to access detailed views like the User Directory and All Jobs list.</p>
        </div>
      )
    });
  }, [setHelp]);

  if (loading) {
      return (
        <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )
  }

  return (
    <>
      <div className="flex items-center mb-8">
        <h1 className="text-lg font-semibold md:text-2xl">Welcome, Admin!</h1>
      </div>
      <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
        <StatCard 
            title="Total Users"
            value={stats.totalUsers}
            description="Installers & Job Givers"
            icon={Users}
            href="/dashboard/users"
            iconBgColor="bg-blue-100 dark:bg-blue-900"
            iconColor="text-blue-600 dark:text-blue-300"
        />
        <StatCard 
            title="Total Jobs"
            value={stats.totalJobs}
            description="View every job in the platform"
            icon={Briefcase}
            href="/dashboard/all-jobs"
            iconBgColor="bg-purple-100 dark:bg-purple-900"
            iconColor="text-purple-600 dark:text-purple-300"
        />
        <StatCard 
            title="Open Disputes"
            value={stats.openDisputes}
            description="Cases requiring review"
            icon={AlertOctagon}
            href="/dashboard/disputes"
            iconBgColor="bg-red-100 dark:bg-red-900"
            iconColor="text-red-600 dark:text-red-300"
        />
        <StatCard 
            title="Completed Job Value"
            value={`₹${stats.completedJobValue.toLocaleString()}`}
            description="Value of all completed jobs"
            icon={IndianRupee}
            href="#"
            iconBgColor="bg-green-100 dark:bg-green-900"
            iconColor="text-green-600 dark:text-green-300"
        />
      </div>
      <div className="mt-8">
         <StatCard 
            title="Reports"
            value=""
            description="View all the reports"
            icon={FileText}
            href="/dashboard/reports"
            iconBgColor="bg-gray-100 dark:bg-gray-900"
            iconColor="text-gray-600 dark:text-gray-300"
        />
      </div>
    </>
  );
}


export default function DashboardPage() {
  const { user, role, loading } = useUser();

  if (loading || !user) {
    return (
        <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
    );
  }

  return (
    <>
      {role === "Admin" ? <AdminDashboard /> : (role === "Installer" ? <InstallerDashboard /> : <JobGiverDashboard />)}
    </>
  );
}
