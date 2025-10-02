
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
  BarChart2,
  PieChart,
  TrendingUp,
  LineChart
} from "lucide-react";
import Link from "next/link";
import { useHelp } from "@/hooks/use-help";
import React from "react";
import { Job, User } from "@/lib/types";
import { collection, getDocs, query, where, DocumentReference, doc } from "firebase/firestore";
import { db } from "@/lib/firebase/client-config";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, Pie, Cell, ComposedChart, YAxis, Legend, Line } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


const jobStatusColors: { [key: string]: string } = {
  'Open for Bidding': 'hsl(var(--success))',
  'In Progress': 'hsl(var(--info))',
  'Awarded': 'hsl(var(--info))',
  'Bidding Closed': 'hsl(var(--warning))',
  'Completed': 'hsl(var(--secondary-foreground))',
  'Cancelled': 'hsl(var(--destructive))',
};

const bidStatusColors: { [key: string]: string } = {
  'Bidded': 'hsl(var(--info))',
  'Awarded': 'hsl(var(--success))',
  'Completed & Won': 'hsl(var(--primary))',
  'Not Selected': 'hsl(var(--destructive))',
  'Cancelled': 'hsl(var(--muted-foreground))',
};


function InstallerDashboard() {
  const { user } = useUser();
  const { setHelp } = useHelp();
  const [stats, setStats] = React.useState({ openJobs: 0, myBids: 0, jobsWon: 0 });
  const [bidStatusData, setBidStatusData] = React.useState<any[]>([]);

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
    if (!user) return;

    const fetchStats = async () => {
      const jobsCollection = collection(db, 'jobs');
      const jobsSnapshot = await getDocs(jobsCollection);
      const allJobs = jobsSnapshot.docs.map(d => ({id: d.id, ...d.data()}) as Job);
      
      const openJobs = allJobs.filter(j => j.status === 'Open for Bidding').length;
      
      let myBidsCount = 0;
      let jobsWonCount = 0;
      const bidStatuses: { [key: string]: number } = { 'Bidded': 0, 'Awarded': 0, 'Completed & Won': 0, 'Not Selected': 0, 'Cancelled': 0 };

      allJobs.forEach(job => {
          const myBid = job.bids.some(bid => (bid.installer as DocumentReference).id === user.id);
          const awardedId = (job.awardedInstaller as DocumentReference)?.id;
          const isAwardedToMe = awardedId === user.id;

          if (myBid || isAwardedToMe) {
              myBidsCount++;
              
              if (isAwardedToMe) {
                  if (job.status === 'Completed') bidStatuses['Completed & Won']++;
                  else if(job.status === 'Awarded' || job.status === 'In Progress') bidStatuses['Awarded']++;
              } else if (job.status === 'Open for Bidding') {
                  bidStatuses['Bidded']++;
              } else if (job.status === 'Cancelled') {
                  bidStatuses['Cancelled']++;
              } else {
                  bidStatuses['Not Selected']++;
              }
          }

          if (isAwardedToMe && (job.status === 'Awarded' || job.status === 'In Progress')) {
              jobsWonCount++;
          }
      });
      
      setStats({ openJobs, myBids: myBidsCount, jobsWon: jobsWonCount });
      setBidStatusData(Object.entries(bidStatuses).map(([name, value]) => ({ name, count: value, fill: bidStatusColors[name] })));
    };

    fetchStats();
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
                  {bidStatusData.map((entry) => (
                      <Cell key={`cell-${entry.name}`} fill={entry.fill} />
                  ))}
              </Pie>
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel />}
              />
            </ChartContainer>
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
  const [jobStatusData, setJobStatusData] = React.useState<any[]>([]);

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
    if (!user) return;
    
    const fetchStats = async () => {
      const userRef = doc(db, 'users', user.id);
      const jobsQuery = query(collection(db, 'jobs'), where('jobGiver', '==', userRef));
      const jobsSnapshot = await getDocs(jobsQuery);
      
      let active = 0;
      let completed = 0;
      let bids = 0;
      const statuses: { [key: string]: number } = { 'Open for Bidding': 0, 'In Progress': 0, 'Completed': 0, 'Cancelled': 0 };

      jobsSnapshot.forEach(jobDoc => {
        const job = jobDoc.data() as Job;
        if (job.status !== 'Completed' && job.status !== 'Cancelled') {
            active++;
        }
        if (job.status === 'Completed') {
            completed++;
        }
        if (statuses[job.status] !== undefined) {
           statuses[job.status]++;
        }
        bids += job.bids?.length || 0;
      });
      
      setStats({ activeJobs: active, completedJobs: completed, totalBids: bids });
      setJobStatusData(Object.entries(statuses).map(([name, value]) => ({ name, count: value, fill: jobStatusColors[name] })));
    };

    fetchStats();
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
                    {jobStatusData.map((entry) => (
                      <Cell key={`cell-${entry.name}`} fill={entry.fill} />
                    ))}
                </Pie>
                 <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel />}
                />
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function AdminDashboard() {
  const { setHelp } = useHelp();
  const [stats, setStats] = React.useState({ totalUsers: 0, totalJobs: 0, totalBids: 0, completedJobValue: 0 });
  const [jobStatusData, setJobStatusData] = React.useState<any[]>([]);
  const [userGrowthData, setUserGrowthData] = React.useState<any[]>([]);
  const [platformActivityData, setPlatformActivityData] = React.useState<any[]>([]);


  const jobStatusChartConfig = {
    count: {
      label: "Jobs",
    },
    ...Object.keys(jobStatusColors).reduce((acc, status) => {
      acc[status] = { label: status, color: jobStatusColors[status] };
      return acc;
    }, {} as ChartConfig),
  } satisfies ChartConfig

  const userGrowthChartConfig = {
    users: {
      label: "New Users",
      color: "hsl(var(--primary))",
    },
  } satisfies ChartConfig
  
  const platformActivityChartConfig = {
    jobs: { label: "Jobs", color: "hsl(var(--chart-1))" },
    bids: { label: "Bids", color: "hsl(var(--chart-2))" },
    value: { label: "Value", color: "hsl(var(--primary))" },
  } satisfies ChartConfig;


  React.useEffect(() => {
    const fetchStats = async () => {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const jobsSnapshot = await getDocs(collection(db, 'jobs'));

        const totalUsers = usersSnapshot.size;
        const totalJobs = jobsSnapshot.size;
        let totalBids = 0;
        let completedValue = 0;

        const statuses: { [key: string]: number } = { 'Open for Bidding': 0, 'In Progress': 0, 'Completed': 0, 'Cancelled': 0, 'Bidding Closed': 0, 'Awarded': 0 };

        const activityData: { [key: string]: { jobs: number, bids: number, value: number } } = {};

        const last6Months = Array.from({ length: 6 }, (_, i) => {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            return d.toLocaleString('default', { month: 'short', year: '2-digit' });
        }).reverse();

        last6Months.forEach(month => {
            activityData[month] = { jobs: 0, bids: 0, value: 0 };
        });

        jobsSnapshot.forEach(jobDoc => {
            const job = jobDoc.data() as Job;
            const jobMonth = new Date(job.postedAt.seconds * 1000).toLocaleString('default', { month: 'short', year: '2-digit' });
            
            totalBids += job.bids?.length || 0;
            if (statuses[job.status] !== undefined) {
               statuses[job.status]++;
            }

            if (activityData[jobMonth]) {
                activityData[jobMonth].jobs++;
                activityData[jobMonth].bids += job.bids?.length || 0;
            }

            if (job.status === 'Completed' && job.awardedInstaller) {
                const awardedId = (job.awardedInstaller as DocumentReference).id;
                const winningBid = job.bids.find(bid => (bid.installer as DocumentReference).id === awardedId);
                if (winningBid) {
                    completedValue += winningBid.amount;
                    if (activityData[jobMonth]) {
                        activityData[jobMonth].value += winningBid.amount;
                    }
                }
            }
        });

        const growthData: { [key: string]: number } = {};
        usersSnapshot.forEach(userDoc => {
            const user = userDoc.data() as User;
            const month = new Date(user.memberSince.seconds * 1000).toLocaleString('default', { month: 'short', year: '2-digit' });
            if (growthData[month]) {
              growthData[month]++;
            } else if (last6Months.includes(month)) {
              growthData[month] = 1;
            }
        });

        setUserGrowthData(last6Months.map(month => ({ month, users: growthData[month] || 0 })));
        setJobStatusData(Object.entries(statuses).map(([name, value]) => ({ name, count: value })));
        setPlatformActivityData(Object.entries(activityData).map(([month, data]) => ({ month, ...data })));
        setStats({ totalUsers, totalJobs, totalBids, completedJobValue: completedValue });
    };

    fetchStats();
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

      <div className="grid grid-cols-1 gap-4 md:gap-8 lg:grid-cols-2">
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><LineChart className="h-5 w-5" /> Platform Activity</CardTitle>
                <CardDescription>Jobs, Bids, and Completed Value over the last 6 months.</CardDescription>
            </CardHeader>
            <CardContent>
                <ChartContainer config={platformActivityChartConfig} className="h-64 w-full">
                    <ComposedChart data={platformActivityData}>
                        <CartesianGrid vertical={false} />
                        <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                        <YAxis yAxisId="left" orientation="left" stroke="hsl(var(--chart-1))" />
                        <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--primary))" />
                        <ChartTooltip content={<ChartTooltipContent />} />
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
            <CardTitle className="flex items-center gap-2"><BarChart2 className="h-5 w-5" /> Jobs Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={jobStatusChartConfig} className="h-64 w-full">
              <BarChart data={jobStatusData} accessibilityLayer>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="name" tickLine={false} tickMargin={10} axisLine={false} />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel />}
                />
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
            <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5" /> User Growth</CardTitle>
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

    