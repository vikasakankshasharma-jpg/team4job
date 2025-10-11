
"use client";

import { useUser } from "@/hooks/use-user";
import { useFirebase } from "@/lib/firebase/client-provider";
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
  BarChart2,
  PieChart,
  TrendingUp,
  LineChart as LineChartIcon,
  AlertOctagon,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { useHelp } from "@/hooks/use-help";
import React from "react";
import { Job, User, Dispute } from "@/lib/types";
import { toDate } from "@/lib/utils";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, Pie, Cell, ComposedChart, YAxis, Legend, Tooltip, Line } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { collection, query, where, getDocs, or, doc, getDoc } from "firebase/firestore";
import { DocumentReference } from "firebase/firestore";


const jobStatusColors: { [key: string]: string } = {
  'Open for Bidding': 'hsl(var(--success))',
  'In Progress': 'hsl(var(--info))',
  'Awarded': 'hsl(var(--primary))',
  'Bidding Closed': 'hsl(var(--warning))',
  'Completed': 'hsl(var(--secondary-foreground))',
  'Cancelled': 'hsl(var(--destructive))',
  'Unbid': 'hsl(var(--muted-foreground))',
};

const bidStatusColors: { [key: string]: string } = {
  'Bidded': 'hsl(var(--info))',
  'Awarded': 'hsl(var(--success))',
  'In Progress': 'hsl(var(--primary))',
  'Completed & Won': 'hsl(var(--success))',
  'Not Selected': 'hsl(var(--destructive))',
  'Cancelled': 'hsl(var(--muted-foreground))',
};

const disputeStatusColors: { [key: string]: string } = {
  'Open': 'hsl(var(--destructive))',
  'Under Review': 'hsl(var(--warning))',
  'Resolved': 'hsl(var(--success))',
};


function InstallerDashboard() {
  const { user } = useUser();
  const { db } = useFirebase();
  const { setHelp } = useHelp();
  const [stats, setStats] = React.useState({ openJobs: 0, myBids: 0, jobsWon: 0 });
  const [bidStatusData, setBidStatusData] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function fetchData() {
        if (!user || !db) return;

        setLoading(true);
        const jobsRef = collection(db, "jobs");
        const openJobsQuery = query(jobsRef, where('status', '==', 'Open for Bidding'));
        
        const installerDocRef = doc(db, 'users', user.id);
        const myJobsQuery = query(jobsRef, or(where('bidderIds', 'array-contains', user.id), where('awardedInstaller', '==', installerDocRef)));
        
        const [openJobsSnapshot, myJobsSnapshot] = await Promise.all([
            getDocs(openJobsQuery),
            getDocs(myJobsQuery)
        ]);

        const myJobs = myJobsSnapshot.docs.map(doc => doc.data() as Job);

        let jobsWonCount = 0;
        const bidStatuses: { [key: string]: number } = { 'Bidded': 0, 'Awarded': 0, 'In Progress': 0, 'Completed & Won': 0, 'Not Selected': 0, 'Cancelled': 0 };

        myJobs.forEach(job => {
            const awardedId = (job.awardedInstaller as DocumentReference)?.id;
            const isAwardedToMe = awardedId === user.id;

            if (isAwardedToMe) {
                if (job.status === 'Completed') bidStatuses['Completed & Won']++;
                else if (job.status === 'In Progress') bidStatuses['In Progress']++;
                else if (job.status === 'Awarded') bidStatuses['Awarded']++;
            } else if (job.status === 'Open for Bidding') {
                bidStatuses['Bidded']++;
            } else if (job.status === 'Cancelled') {
                bidStatuses['Cancelled']++;
            } else {
                bidStatuses['Not Selected']++;
            }
            
            if (isAwardedToMe && (job.status === 'Awarded' || job.status === 'In Progress')) {
                jobsWonCount++;
            }
        });

        setStats({
            openJobs: openJobsSnapshot.size,
            myBids: myJobs.length,
            jobsWon: jobsWonCount
        });

        setBidStatusData(Object.entries(bidStatuses).filter(([,value]) => value > 0).map(([name, value]) => ({ name, count: value, fill: bidStatusColors[name] })));
        setLoading(false);
    }
    fetchData();
  }, [user, db]);

  const bidStatusChartConfig = {
    count: {
      label: "Bids",
    },
    ...Object.keys(bidStatusColors).reduce((acc, status) => {
      acc[status] = { label: status, color: bidStatusColors[status] };
      return acc;
    }, {} as ChartConfig),
  } satisfies ChartConfig

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

  if (loading) {
      return (
        <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )
  }

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
         <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><PieChart className="h-5 w-5" /> My Bids Overview</CardTitle>
            <CardDescription>
              A summary of all your bidding activity.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={bidStatusChartConfig} className="mx-auto aspect-square h-64">
              <Pie
                  data={bidStatusData}
                  dataKey="count"
                  nameKey="name"
                  innerRadius={60}
                  strokeWidth={5}
              >
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent hideLabel />}
                  />
                  {bidStatusData.map((entry) => (
                      <Cell key={`cell-${entry.name}`} fill={entry.fill} />
                  ))}
              </Pie>
            </ChartContainer>
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
  const [stats, setStats] = React.useState({ activeJobs: 0, completedJobs: 0, totalBids: 0 });
  const [jobStatusData, setJobStatusData] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function fetchData() {
        if (!user || !db) return;
        setLoading(true);
        const myJobsQuery = query(collection(db, "jobs"), where('jobGiver', '==', doc(db, 'users', user.id)));
        const myJobsSnapshot = await getDocs(myJobsQuery);
        const myJobs = myJobsSnapshot.docs.map(doc => doc.data() as Job);

        let active = 0;
        let completed = 0;
        let bids = 0;
        const statuses: { [key: string]: number } = { 'Open for Bidding': 0, 'In Progress': 0, 'Awarded': 0, 'Completed': 0, 'Cancelled': 0, 'Unbid': 0, 'Bidding Closed': 0 };

        myJobs.forEach(job => {
            if (job.status !== 'Completed' && job.status !== 'Cancelled') {
                active++;
            }
            if (job.status === 'Completed') {
                completed++;
            }
            bids += (job.bids || []).length;
            if (statuses[job.status] !== undefined) {
                statuses[job.status]++;
            }
        });
        
        setStats({ activeJobs: active, completedJobs: completed, totalBids: bids });
        setJobStatusData(Object.entries(statuses).filter(([,value]) => value > 0).map(([name, value]) => ({ name, count: value, fill: jobStatusColors[name] })));
        setLoading(false);
    }
    fetchData();
  }, [user, db]);

  const jobStatusChartConfig = {
    count: {
      label: "Jobs",
    },
    ...Object.keys(jobStatusColors).reduce((acc, status) => {
      acc[status] = { label: status, color: jobStatusColors[status] };
      return acc;
    }, {} as ChartConfig),
  } satisfies ChartConfig

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

  if (loading) {
      return (
        <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )
  }
  
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
         <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><PieChart className="h-5 w-5" /> My Jobs Status</CardTitle>
            <CardDescription>
              An overview of all the jobs you have posted.
            </CardDescription>
          </CardHeader>
          <CardContent>
             <ChartContainer config={jobStatusChartConfig} className="mx-auto aspect-square h-64">
                <Pie data={jobStatusData} dataKey="count" nameKey="name" innerRadius={60} strokeWidth={5}>
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent hideLabel />}
                    />
                    {jobStatusData.map((entry) => (
                      <Cell key={`cell-${entry.name}`} fill={entry.fill} />
                    ))}
                </Pie>
            </ChartContainer>
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
  const [jobStatusData, setJobStatusData] = React.useState<any[]>([]);
  const [userGrowthData, setUserGrowthData] = React.useState<any[]>([]);
  const [platformActivityData, setPlatformActivityData] = React.useState<any[]>([]);
  const [disputeStatusData, setDisputeStatusData] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  
  React.useEffect(() => {
    async function fetchData() {
        if (!user || !db) return;
        setLoading(true);
        const usersSnapshot = await getDocs(collection(db, "users"));
        const jobsSnapshot = await getDocs(collection(db, "jobs"));
        const disputesSnapshot = await getDocs(collection(db, "disputes"));

        const allUsers = usersSnapshot.docs.map(d => d.data() as User);
        const allJobs = jobsSnapshot.docs.map(d => d.data() as Job);
        const allDisputes = disputesSnapshot.docs.map(d => d.data() as Dispute);
        
        // Populate awardedInstaller user data for calculating job value
        const installerIds = new Set<string>();
        allJobs.forEach(job => {
            if (job.status === 'Completed' && job.awardedInstaller) {
                const awardedInstallerId = (job.awardedInstaller as DocumentReference).id;
                installerIds.add(awardedInstallerId);
            }
        });

        const installersData: { [key: string]: User } = {};
        if (installerIds.size > 0) {
            // Firestore 'in' query can take up to 30 elements
            const installerIdChunks = Array.from(installerIds).reduce((acc, item, i) => {
                const chunkIndex = Math.floor(i/30);
                if(!acc[chunkIndex]) acc[chunkIndex] = [];
                acc[chunkIndex].push(item);
                return acc;
            }, [] as string[][]);

            for (const chunk of installerIdChunks) {
                const installersQuery = query(collection(db, "users"), where('__name__', 'in', chunk));
                const installersSnapshot = await getDocs(installersQuery);
                installersSnapshot.forEach(doc => {
                    installersData[doc.id] = doc.data() as User;
                });
            }
        }
        
        let completedJobValue = 0;
        allJobs.forEach(job => {
            if (job.status === 'Completed' && job.awardedInstaller) {
                const awardedInstallerId = (job.awardedInstaller as DocumentReference).id;
                const winningBid = (job.bids || []).find(bid => ((bid.installer as DocumentReference)?.id) === awardedInstallerId);
                if (winningBid) {
                    completedJobValue += winningBid.amount;
                }
            }
        });

        setStats({
            totalUsers: allUsers.length,
            totalJobs: allJobs.length,
            openDisputes: allDisputes.filter(d => d.status === 'Open').length,
            completedJobValue
        });

        const jobStatuses: { [key: string]: number } = { 'Open for Bidding': 0, 'In Progress': 0, 'Completed': 0, 'Cancelled': 0, 'Bidding Closed': 0, 'Awarded': 0, 'Unbid': 0 };
        const disputeStatuses: { [key: string]: number } = { 'Open': 0, 'Under Review': 0, 'Resolved': 0 };

        allJobs.forEach(job => {
            if (jobStatuses[job.status] !== undefined) {
                jobStatuses[job.status]++;
            }
        });

        allDisputes.forEach(dispute => {
            if (disputeStatuses[dispute.status] !== undefined) {
                disputeStatuses[dispute.status]++;
            }
        });
        
        const last6Months = Array.from({ length: 6 }, (_, i) => {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            return {
                label: d.toLocaleString('default', { month: 'short', year: '2-digit' }),
                date: new Date(d.getFullYear(), d.getMonth(), 1)
            };
        }).reverse();
        
        const activityData: { [key: string]: { jobs: number, bids: number, value: number } } = {};
        last6Months.forEach(month => {
            activityData[month.label] = { jobs: 0, bids: 0, value: 0 };
        });

        allJobs.forEach(job => {
            const postedDate = toDate(job.postedAt);
            const jobMonthLabel = postedDate.toLocaleString('default', { month: 'short', year: '2-digit' });

            if (activityData[jobMonthLabel]) {
                activityData[jobMonthLabel].jobs++;
                activityData[jobMonthLabel].bids += (job.bids || []).length;
            }

            if (job.status === 'Completed' && job.awardedInstaller) {
                const winningBid = (job.bids || []).find(bid => ((bid.installer as DocumentReference).id) === ((job.awardedInstaller as DocumentReference).id));
                if (winningBid && activityData[jobMonthLabel]) {
                    activityData[jobMonthLabel].value += winningBid.amount;
                }
            }
        });

        const growthData: { [key: string]: number } = {};
        last6Months.forEach(month => {
            growthData[month.label] = 0;
        });

        allUsers.forEach(user => {
            const memberSinceDate = toDate(user.memberSince);
            const monthLabel = memberSinceDate.toLocaleString('default', { month: 'short', year: '2-digit' });
            if (growthData[monthLabel] !== undefined) {
            growthData[monthLabel]++;
            }
        });

        setJobStatusData(Object.entries(jobStatuses).filter(([,value]) => value > 0).map(([name, value]) => ({ name, count: value, fill: jobStatusColors[name] })));
        setDisputeStatusData(Object.entries(disputeStatuses).filter(([,value]) => value > 0).map(([name, value]) => ({ name, count: value, fill: disputeStatusColors[name] })));
        setUserGrowthData(last6Months.map(month => ({ month: month.label, users: growthData[month.label] || 0 })));
        setPlatformActivityData(Object.entries(activityData).map(([month, data]) => ({ month, ...data })));
        setLoading(false);
    }
    fetchData();
  }, [user, db]);

  const jobStatusChartConfig = {
    count: { label: "Jobs" },
    ...Object.keys(jobStatusColors).reduce((acc, status) => {
      acc[status] = { label: status, color: jobStatusColors[status] };
      return acc;
    }, {} as ChartConfig),
  } satisfies ChartConfig

  const userGrowthChartConfig = {
    users: { label: "New Users", color: "hsl(var(--primary))" },
  } satisfies ChartConfig
  
  const platformActivityChartConfig = {
    jobs: { label: "Jobs Created", color: "hsl(var(--chart-1))" },
    bids: { label: "Bids Placed", color: "hsl(var(--chart-2))" },
    value: { label: "Completed Value", color: "hsl(var(--primary))" },
  } satisfies ChartConfig;

  const disputeStatusChartConfig = {
    count: { label: "Disputes" },
    ...Object.keys(disputeStatusColors).reduce((acc, status) => {
      acc[status] = { label: status, color: disputeStatusColors[status] };
      return acc;
    }, {} as ChartConfig),
  } satisfies ChartConfig;

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
          <p>Use the charts to track growth, activity, and platform health. Use the navigation menu to access detailed views like the User Directory and All Jobs list.</p>
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
          <Link href="/dashboard/all-jobs">
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
          </Link>
        </Card>
        <Card>
           <Link href="/dashboard/disputes">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Open Disputes</CardTitle>
              <AlertOctagon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.openDisputes}</div>
              <p className="text-xs text-muted-foreground">
                Cases requiring review
              </p>
            </CardContent>
          </Link>
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

      <div className="grid grid-cols-1 gap-4 md:gap-8 lg:grid-cols-2">
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><LineChartIcon className="h-5 w-5" /> Platform Activity</CardTitle>
                <CardDescription>Jobs created, bids placed, and completed value over the last 6 months.</CardDescription>
            </CardHeader>
            <CardContent>
                <ChartContainer config={platformActivityChartConfig} className="h-64 w-full">
                    <ComposedChart data={platformActivityData}>
                        <CartesianGrid vertical={false} />
                        <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                        <YAxis yAxisId="left" orientation="left" stroke="hsl(var(--chart-1))" />
                        <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--primary))" />
                        <Tooltip content={<ChartTooltipContent />} />
                        <Legend />
                        <Bar dataKey="jobs" fill="var(--color-jobs)" yAxisId="left" name="Jobs" radius={4} />
                        <Bar dataKey="bids" fill="var(--color-bids)" yAxisId="left" name="Bids" radius={4} />
                        <Line type="monotone" dataKey="value" stroke="var(--color-value)" yAxisId="right" name="Value (₹)" />
                    </ComposedChart>
                </ChartContainer>
            </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5" /> User Growth</CardTitle>
            <CardDescription>New user sign-ups over the last 6 months.</CardDescription>
          </CardHeader>
          <CardContent>
             <ChartContainer config={userGrowthChartConfig} className="h-64 w-full">
              <AreaChart data={userGrowthData} accessibilityLayer margin={{ left: 12, right: 12, top: 10 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="dot" />}
                />
                <Area
                  dataKey="users"
                  type="natural"
                  fill="var(--color-users)"
                  fillOpacity={0.4}
                  stroke="var(--color-users)"
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><BarChart2 className="h-5 w-5" /> Jobs Status Overview</CardTitle>
            <CardDescription>A snapshot of all jobs currently on the platform by their status.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={jobStatusChartConfig} className="h-64 w-full">
              <BarChart data={jobStatusData} accessibilityLayer>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="name" tickLine={false} tickMargin={10} axisLine={false} tickFormatter={(value) => value.substring(0, 3)} />
                <Tooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" radius={5}>
                   {jobStatusData.map((entry) => (
                      <Cell key={`cell-${entry.name}`} fill={jobStatusColors[entry.name]} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><AlertOctagon className="h-5 w-5" /> Disputes Overview</CardTitle>
            <CardDescription>Current status of all dispute resolution cases.</CardDescription>
          </CardHeader>
          <CardContent>
             <ChartContainer config={disputeStatusChartConfig} className="mx-auto aspect-square h-64">
                <Pie data={disputeStatusData} dataKey="count" nameKey="name" innerRadius={60} strokeWidth={5}>
                    <Tooltip content={<ChartTooltipContent hideLabel />} />
                    {disputeStatusData.map((entry) => (
                      <Cell key={`cell-${entry.name}`} fill={entry.fill} />
                    ))}
                </Pie>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
      
       {userGrowthData.length > 0 && userGrowthData[userGrowthData.length - 1].users > 5 && (
            <Alert>
                <TrendingUp className="h-4 w-4" />
                <AlertTitle>Congratulations!</AlertTitle>
                <AlertDescription>
                    Your platform is growing! You had {userGrowthData[userGrowthData.length - 1].users} new sign-ups this month. Keep up the great work.
                </AlertDescription>
            </Alert>
       )}
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
