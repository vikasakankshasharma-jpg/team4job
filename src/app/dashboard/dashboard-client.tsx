
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
  Briefcase,
  MessageSquare,
  Clock,
  Award,
  Medal,
  Bot,
  HardDriveDownload,
} from "lucide-react";
import Link from "next/link";
import { useHelp } from "@/hooks/use-help";
import React from "react";
import { Job, User, Dispute, Transaction, Role } from "@/lib/types";
import { collection, query, where, getDocs, or, and, doc, getDoc } from "firebase/firestore";
import { DocumentReference } from "firebase/firestore";
import { cn, toDate } from "@/lib/utils";
import { differenceInMilliseconds, format, getMonth, getYear, startOfMonth, subMonths } from "date-fns";
import { ChartContainer, ChartConfig } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Area, AreaChart, RadialBar, RadialBarChart, PolarGrid, PolarAngleAxis, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AnimatedAvatar } from "@/components/ui/animated-avatar";

import { RecommendedJobs } from "@/components/dashboard/recommended-jobs";
import { RecentActivity } from "@/components/dashboard/recent-activity";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const StatCard = ({ title, value, description, icon: Icon, href, iconBgColor, iconColor, trend }: { title: string, value: string | number, description?: string, icon: React.ElementType, href: string, iconBgColor: string, iconColor: string, trend?: string }) => (
  <Link href={href} className="block hover:shadow-lg transition-shadow duration-300 rounded-lg h-full">
    <Card className="flex flex-col h-full relative overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className={cn("p-2 rounded-full", iconBgColor)}>
          <Icon className={cn("h-4 w-4", iconColor)} />
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
        <div className="text-2xl font-bold">{value}</div>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
        {trend && (
          <div className="absolute bottom-4 right-4 text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-md">
            {trend}
          </div>
        )}
      </CardContent>
    </Card>
  </Link>
);

function MetricChartCard({ title, description, children, className }: { title: string, description?: string, children: React.ReactNode, className?: string }) {
  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="flex-1 min-h-[300px]">
        {children}
      </CardContent>
    </Card>
  )
}


function DisputePerformanceCard({ disputes }: { disputes: Dispute[] }) {
  const totalDisputes = disputes.length;
  const resolvedDisputes = disputes.filter(d => d.status === 'Resolved').length;
  const resolutionRate = totalDisputes > 0 ? (resolvedDisputes / totalDisputes) * 100 : 0;

  const totalResolutionTime = disputes
    .filter(d => d.status === 'Resolved' && d.createdAt && d.resolvedAt)
    .reduce((acc, d) => {
      const timeDiff = differenceInMilliseconds(toDate(d.resolvedAt!), toDate(d.createdAt));
      return acc + timeDiff;
    }, 0);

  const avgResolutionTimeMs = resolvedDisputes > 0 ? totalResolutionTime / resolvedDisputes : 0;
  const avgResolutionTimeDays = avgResolutionTimeMs / (1000 * 60 * 60 * 24);

  const chartData = [{ name: 'Resolved', value: resolutionRate, fill: 'hsl(var(--primary))' }];
  const performanceChartConfig = {
    value: { label: 'Disputes' },
  } satisfies ChartConfig;

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Dispute Performance</CardTitle>
        <CardDescription>An overview of your dispute resolution metrics.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 md:grid-cols-2">
        <Card className="flex flex-col items-center justify-center p-6">
          <ChartContainer
            config={performanceChartConfig}
            className="mx-auto aspect-square h-full w-full max-w-[250px]"
          >
            <RadialBarChart
              data={chartData}
              startAngle={90}
              endAngle={-270}
              innerRadius="70%"
              outerRadius="110%"
            >
              <PolarGrid gridType="circle" radialLines={false} stroke="none" />
              <RadialBar dataKey="value" background cornerRadius={10} />
              <PolarAngleAxis type="number" domain={[0, 100]} dataKey="value" tick={false} />
            </RadialBarChart>
          </ChartContainer>
          <p className="text-5xl font-bold mt-[-2.5rem]">{resolutionRate.toFixed(0)}<span className="text-xl text-muted-foreground">%</span></p>
          <p className="text-center text-sm text-muted-foreground mt-2">Resolution Rate</p>
        </Card>
        <div className="grid grid-rows-3 gap-4">
          <Card className="flex flex-col items-center justify-center p-4 text-center">
            <MessageSquare className="h-6 w-6 mb-2 text-primary" />
            <p className="text-2xl font-bold">{totalDisputes}</p>
            <p className="text-sm text-muted-foreground">Total Disputes Handled</p>
          </Card>
          <Card className="flex flex-col items-center justify-center p-4 text-center">
            <ShieldCheck className="h-6 w-6 mb-2 text-green-600" />
            <p className="text-2xl font-bold">{resolvedDisputes}</p>
            <p className="text-sm text-muted-foreground">Disputes Resolved</p>
          </Card>
          <Card className="flex flex-col items-center justify-center p-4 text-center">
            <Clock className="h-6 w-6 mb-2 text-amber-500" />
            <p className="text-2xl font-bold">{avgResolutionTimeDays.toFixed(1)} Days</p>
            <p className="text-sm text-muted-foreground">Avg. Resolution Time</p>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
}

function InstallerDashboard() {
  const { user } = useUser();
  const { db } = useFirebase();
  const { setHelp } = useHelp();
  const [stats, setStats] = React.useState({ openJobs: 0, myBids: 0, jobsWon: 0 });
  const [loading, setLoading] = React.useState(true);

  const isVerified = user?.installerProfile?.verified;

  const [transactions, setTransactions] = React.useState<Transaction[]>([]);

  React.useEffect(() => {
    async function fetchData() {
      if (!user || !db) return;

      setLoading(true);
      try {
        const jobsRef = collection(db, "jobs");
        const openJobsQuery = query(jobsRef, where('status', '==', 'Open for Bidding'));
        const installerDocRef = doc(db, 'users', user.id);

        // Fix: Queries for arrays or specific fields
        const myBidsQuery = query(jobsRef, where('bidderIds', 'array-contains', user.id));
        const myAwardedQuery = query(jobsRef, where('awardedInstaller', '==', installerDocRef));

        // Transactions for Earnings (Released & Funded)
        const transactionsQuery = query(
          collection(db, "transactions"),
          where("payeeId", "==", user.id)
        );

        const [openJobsSnapshot, myBidsSnapshot, myAwardedSnapshot, transactionsSnapshot] = await Promise.all([
          getDocs(openJobsQuery),
          getDocs(myBidsQuery),
          getDocs(myAwardedQuery),
          getDocs(transactionsQuery)
        ]);

        const myJobsSet = new Set([...myBidsSnapshot.docs.map(d => d.id), ...myAwardedSnapshot.docs.map(d => d.id)]);

        setStats({
          openJobs: openJobsSnapshot.size,
          myBids: myJobsSet.size,
          jobsWon: myAwardedSnapshot.size
        });

        setTransactions(transactionsSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Transaction)));

      } catch (error) {
        console.error("Error fetching InstallerDashboard data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();

  }, [user, db]);

  // Process Data for Earnings Chart (Last 6 Months - Realized Only)
  const earningsData = React.useMemo(() => {
    const months = Array.from({ length: 6 }).map((_, i) => {
      const d = subMonths(new Date(), i);
      return {
        name: format(d, 'MMM'),
        fullName: format(d, 'MMM yyyy'),
        amount: 0,
        date: d
      };
    }).reverse();

    transactions.forEach(t => {
      if (t.status === 'Released' && t.releasedAt) {
        const date = toDate(t.releasedAt);
        const monthStr = format(date, 'MMM yyyy');
        const monthData = months.find(m => m.fullName === monthStr);
        if (monthData) {
          monthData.amount += t.payoutToInstaller || 0;
        }
      }
    });
    return months;
  }, [transactions]);

  const totalEarnings = transactions
    .filter(t => t.status === 'Released')
    .reduce((acc, t) => acc + (t.payoutToInstaller || 0), 0);

  const projectedEarnings = transactions
    .filter(t => t.status === 'Funded')
    .reduce((acc, t) => acc + (t.payoutToInstaller || 0), 0);


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
              <span className="font-semibold">My Bids:</span> Tracks all the jobs you&apos;ve bid on and their current status (Bidded, Awarded, etc.). Click to see your bidding history.
            </li>
            <li>
              <span className="font-semibold">Jobs Won:</span> Displays the number of jobs you&apos;ve won that are currently active or in progress.
            </li>
            <li>
              <span className="font-semibold">Projected Earnings:</span> The total value of jobs currently in the &quot;Funded&quot; (Locked) state that you are working on.
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
      {user?.roles.includes('Installer') && !isVerified && (
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

      {/* Earnings Chart Section */}
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <MetricChartCard title="Earnings Overview" description="Your monthly earnings over last 6 months" className="md:col-span-2">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={earningsData}>
              <defs>
                <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" />
              <YAxis tickFormatter={(val) => `₹${val}`} />
              <Tooltip formatter={(val) => `₹${Number(val).toLocaleString()}`} labelStyle={{ color: 'black' }} />
              <Area type="monotone" dataKey="amount" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorEarnings)" name="Earnings" />
            </AreaChart>
          </ResponsiveContainer>
        </MetricChartCard>

        <div className="flex flex-col gap-4">
          <Card className="flex flex-col justify-center items-center text-center p-6 bg-green-50 dark:bg-green-950/20 border-green-100 dark:border-green-900 flex-1">
            <div className="p-4 rounded-full bg-green-200 dark:bg-green-900 mb-4">
              <IndianRupee className="h-8 w-8 text-green-700 dark:text-green-400" />
            </div>
            <p className="text-sm font-medium text-green-600 dark:text-green-400">Total Earnings</p>
            <h3 className="text-4xl font-bold mt-2 text-green-800 dark:text-green-300">₹{totalEarnings.toLocaleString()}</h3>
            <p className="text-xs text-muted-foreground mt-2">Lifetime payout processed</p>
          </Card>

          <Card className="flex flex-col justify-center items-center text-center p-6 bg-blue-50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900 flex-1">
            <div className="p-4 rounded-full bg-blue-200 dark:bg-blue-900 mb-4">
              <Clock className="h-8 w-8 text-blue-700 dark:text-blue-400" />
            </div>
            <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Projected Earnings</p>
            <h3 className="text-4xl font-bold mt-2 text-blue-800 dark:text-blue-300">₹{projectedEarnings.toLocaleString()}</h3>
            <p className="text-xs text-muted-foreground mt-2">Funds currently Locked</p>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-4">
        <div className="mt-8 mb-8">
          <RecommendedJobs user={user!} />
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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

          <RecentActivity />

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
      </div>
    </>
  );
}

function JobGiverDashboard() {
  const { user } = useUser();
  const { db } = useFirebase();
  const { setHelp } = useHelp();
  const [stats, setStats] = React.useState<{ activeJobs: number, completedJobs: number, totalBids: number, openDisputes: number, cancelledJobs: number, transactions: Transaction[] }>({ activeJobs: 0, completedJobs: 0, totalBids: 0, openDisputes: 0, cancelledJobs: 0, transactions: [] });
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function fetchData() {
      if (!user || !db) return;
      setLoading(true);

      try {
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

        const transactionsQuery = query(
          collection(db, "transactions"),
          where("payerId", "==", user.id)
        );

        const [myJobsSnapshot, disputesSnapshot, transactionsSnapshot] = await Promise.all([
          getDocs(myJobsQuery),
          getDocs(disputesQuery),
          getDocs(transactionsQuery)
        ]);

        const myJobs = myJobsSnapshot.docs.map(doc => doc.data() as Job);
        const myTransactions = transactionsSnapshot.docs.map(doc => doc.data() as Transaction);

        let active = 0;
        let completed = 0;
        let bids = 0;
        let cancelled = 0;

        myJobs.forEach(job => {
          if (job.status === 'Completed') completed++;
          else if (job.status === 'Cancelled') cancelled++;
          else active++;

          bids += (job.bids || []).length;
        });

        setStats({
          activeJobs: active,
          completedJobs: completed,
          totalBids: bids,
          openDisputes: disputesSnapshot.size,
          cancelledJobs: cancelled,
          transactions: myTransactions
        });
      } catch (error) {
        console.error("Error fetching JobGiverDashboard data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();

  }, [user, db]);

  // Process Data for Spending Chart (Last 6 Months - Released Only)
  const { spendingData, jobStatusData, totalSpent, fundsInEscrow } = React.useMemo(() => {
    const months = Array.from({ length: 6 }).map((_, i) => {
      const d = subMonths(new Date(), i);
      return {
        name: format(d, 'MMM'),
        fullName: format(d, 'MMM yyyy'),
        amount: 0
      };
    }).reverse();

    const transactions = stats.transactions || [];
    transactions.forEach(t => {
      if (t.status === 'Released' && t.releasedAt) {
        const date = toDate(t.releasedAt);
        const monthStr = format(date, 'MMM yyyy');
        const monthData = months.find(m => m.fullName === monthStr);
        if (monthData) {
          monthData.amount += t.totalPaidByGiver || 0;
        }
      }
    });

    const totalSpent = transactions
      .filter(t => t.status === 'Released')
      .reduce((acc, t) => acc + (t.totalPaidByGiver || 0), 0);

    const fundsInEscrow = transactions
      .filter(t => t.status === 'Funded')
      .reduce((acc, t) => acc + (t.totalPaidByGiver || 0), 0);

    const jobStatusData = [
      { name: 'Active', value: stats.activeJobs, color: '#0088FE' }, // Blue
      { name: 'Completed', value: stats.completedJobs, color: '#00C49F' }, // Green
      { name: 'Cancelled', value: stats.cancelledJobs, color: '#FF8042' } // Orange
    ].filter(d => d.value > 0);

    return { spendingData: months, jobStatusData, totalSpent, fundsInEscrow };
  }, [stats]);

  React.useEffect(() => {
    setHelp({
      title: 'Job Giver Dashboard Guide',
      content: (
        <div className="space-y-4 text-sm">
          <p>Welcome to your Dashboard! This is your control center for hiring and managing installers.</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <span className="font-semibold">Active Jobs:</span> This shows the number of jobs you&apos;ve posted that are currently open for bidding or in progress. Click to manage them.
            </li>
            <li>
              <span className="font-semibold">Funds in Secure Deposit:</span> The total amount you have currently deposited in safe Lock for active jobs.
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
          <p>Use the navigation on the left to access other sections, like &quot;My Jobs&quot; to review bids on your active postings.</p>
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
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
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
          title="Funds in Secure Deposit"
          value={`₹${fundsInEscrow.toLocaleString()}`}
          description="Securely Locked for active jobs"
          icon={ShieldCheck}
          href="/dashboard/posted-jobs" // Or transactions
          iconBgColor="bg-encrow-100 dark:bg-indigo-900"
          iconColor="text-indigo-600 dark:text-indigo-300"
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

      {/* Job Giver Charts Section */}
      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <MetricChartCard title="Spending History" description={`Total Spent: ₹${totalSpent.toLocaleString()} (Released)`} className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={spendingData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" />
              <YAxis tickFormatter={(val) => `₹${val}`} />
              <Tooltip formatter={(val) => `₹${Number(val).toLocaleString()}`} labelStyle={{ color: 'black' }} cursor={{ fill: 'transparent' }} />
              <Bar dataKey="amount" fill="#8884d8" radius={[4, 4, 0, 0]} name="Spent" />
            </BarChart>
          </ResponsiveContainer>
        </MetricChartCard>

        <MetricChartCard title="Job Statuses" description="Distribution of your posted jobs">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={jobStatusData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {jobStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" height={36} />
            </PieChart>
          </ResponsiveContainer>
        </MetricChartCard>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
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

        <RecentActivity />

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

const tierIcons: Record<string, React.ReactNode> = {
  Bronze: <Medal className="h-4 w-4 text-yellow-700" />,
  Silver: <Medal className="h-4 w-4 text-gray-400" />,
  Gold: <Award className="h-4 w-4 text-amber-500" />,
  Platinum: <Award className="h-4 w-4 text-cyan-400" />,
};

function TopPerformersCard({ installers }: { installers: User[] }) {
  const rankedInstallers = React.useMemo(() => {
    const now = new Date();
    const lastMonthDate = subMonths(now, 1);
    const lastMonthName = format(lastMonthDate, 'MMMM yyyy');

    const twoMonthsAgoDate = subMonths(now, 2);
    const twoMonthsAgoName = format(twoMonthsAgoDate, 'MMMM yyyy');

    return installers
      .filter(i => i.installerProfile)
      .map(installer => {
        const history = installer.installerProfile?.reputationHistory || [];

        const lastMonthEntry = history.find(h => h.month === lastMonthName);
        const twoMonthsAgoEntry = history.find(h => h.month === twoMonthsAgoName);

        const lastMonthPoints = lastMonthEntry?.points || 0;
        const twoMonthsAgoPoints = twoMonthsAgoEntry?.points || 0;
        const monthlyPoints = Math.max(0, lastMonthPoints - twoMonthsAgoPoints);

        return { ...installer, monthlyPoints };
      })
      .sort((a, b) => {
        if (b.monthlyPoints !== a.monthlyPoints) return b.monthlyPoints - a.monthlyPoints;
        if ((b.installerProfile?.rating || 0) !== (a.installerProfile?.rating || 0)) return (b.installerProfile?.rating || 0) - (a.installerProfile?.rating || 0);
        return toDate(a.memberSince).getTime() - toDate(b.memberSince).getTime();
      });
  }, [installers]);

  const lastMonthName = format(subMonths(new Date(), 1), 'MMMM yyyy');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Performers ({lastMonthName})</CardTitle>
        <CardDescription>Installers with the highest reputation gain last month.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Installer</TableHead>
              <TableHead className="text-right">Points Gained</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rankedInstallers.slice(0, 3).map((installer, index) => (
              <TableRow key={installer.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-lg w-4">{index + 1}</span>
                    <Avatar className="h-9 w-9 hidden sm:flex">
                      <AnimatedAvatar svg={installer.avatarUrl} />
                    </Avatar>
                    <div>
                      <Link href={`/dashboard/users/${installer.id}`} className="font-medium hover:underline">{installer.name}</Link>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {tierIcons[installer.installerProfile?.tier || 'Bronze']}
                        <span>{installer.installerProfile?.tier} Tier</span>
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right font-semibold text-green-600">+{installer.monthlyPoints} pts</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {rankedInstallers.length === 0 && (
          <p className="text-center py-4 text-muted-foreground">Not enough data to rank performers.</p>
        )}
      </CardContent>
    </Card>
  );
}

function FinancialSummaryCard({ transactions }: { transactions: Transaction[] }) {
  const summary = React.useMemo(() => {
    return transactions.reduce((acc, t) => {
      if (t.status === 'Released') {
        acc.totalReleased += t.payoutToInstaller;
        acc.platformRevenue += t.commission + t.jobGiverFee;
      }
      if (t.status === 'Funded') {
        acc.fundsHeld += t.totalPaidByGiver;
      }
      if (t.status === 'Funded' || t.status === 'Released') {
        acc.totalVolume += t.totalPaidByGiver;
      }
      return acc;
    }, {
      totalVolume: 0,
      totalReleased: 0,
      platformRevenue: 0,
      fundsHeld: 0,
    });
  }, [transactions]);

  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle>Financial Summary</CardTitle>
        <CardDescription>A real-time overview of financial activities on the platform.</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
        <Card className="p-4">
          <p className="text-sm font-medium">Total Volume</p>
          <p className="text-2xl font-bold">₹{summary.totalVolume.toLocaleString()}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm font-medium">Platform Revenue</p>
          <p className="text-2xl font-bold text-green-600">₹{summary.platformRevenue.toLocaleString()}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm font-medium">Funds Released</p>
          <p className="text-2xl font-bold">₹{summary.totalReleased.toLocaleString()}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm font-medium">Funds Held</p>
          <p className="text-2xl font-bold">₹{summary.fundsHeld.toLocaleString()}</p>
        </Card>
      </CardContent>
    </Card>
  )
}


function AdminDashboard() {
  const { user } = useUser();
  const { db } = useFirebase();
  const { setHelp } = useHelp();
  const [stats, setStats] = React.useState({ totalUsers: 0, totalJobs: 0, openDisputes: 0, totalValueReleased: 0 });
  const [allUsers, setAllUsers] = React.useState<User[]>([]);
  const [allJobs, setAllJobs] = React.useState<Job[]>([]);
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function fetchData() {
      if (!user || !db) return;
      setLoading(true);

      const usersQuery = query(collection(db, "users"));
      const jobsQuery = query(collection(db, "jobs"));
      const disputesQuery = query(collection(db, "disputes"), where('status', '==', 'Open'));
      const transactionsQuery = query(collection(db, "transactions"));

      const [usersSnapshot, jobsSnapshot, disputesSnapshot, transactionsSnapshot] = await Promise.all([
        getDocs(usersQuery),
        getDocs(jobsQuery),
        getDocs(disputesQuery),
        getDocs(transactionsQuery),
      ]);

      setAllUsers(usersSnapshot.docs.map(d => d.data() as User));
      setAllJobs(jobsSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Job)));
      setTransactions(transactionsSnapshot.docs.map(d => d.data() as Transaction));

      const totalValueReleased = transactionsSnapshot.docs
        .map(d => d.data() as Transaction)
        .filter(t => t.status === 'Released')
        .reduce((sum, t) => sum + t.payoutToInstaller, 0);

      setStats({
        totalUsers: usersSnapshot.size,
        totalJobs: jobsSnapshot.size,
        openDisputes: disputesSnapshot.size,
        totalValueReleased
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
            <li><span className="font-semibold">Total Users:</span> The total number of registered users.</li>
            <li><span className="font-semibold">Total Jobs:</span> The total number of jobs created.</li>
            <li><span className="font-semibold">Open Disputes:</span> Active disputes requiring review.</li>
            <li><span className="font-semibold">Value Released:</span> Total monetary value released to installers.</li>
            <li><span className="font-semibold">Financial Summary:</span> Real-time platform revenue and funds held.</li>
            <li><span className="font-semibold">Top Performers:</span> Leaderboard of best installers (Last Month).</li>
            <li><span className="font-semibold">User Growth:</span> New user sign-ups chart (6 Months).</li>
          </ul>
        </div>
      )
    });
  }, [setHelp]);

  const userGrowthData = React.useMemo(() => {
    const now = new Date();
    const data = Array.from({ length: 6 }).map((_, i) => {
      const monthDate = subMonths(startOfMonth(now), i);
      const monthName = format(monthDate, 'MMM');
      return { name: monthName, Installers: 0, "Job Givers": 0 };
    }).reverse();

    (allUsers || []).forEach(user => {
      if (!user.memberSince) return;

      const joinDate = toDate(user.memberSince);
      if (joinDate > subMonths(now, 6)) {
        const monthName = format(joinDate, 'MMM');
        const monthData = data.find(m => m.name === monthName);
        if (monthData) {
          if (user.roles?.includes('Installer')) monthData.Installers++;
          if (user.roles?.includes('Job Giver')) monthData["Job Givers"]++;
        }
      }
    });
    return data;
  }, [allUsers]);

  const { revenueData, jobHealthData } = React.useMemo(() => {
    const months = Array.from({ length: 6 }).map((_, i) => {
      const d = subMonths(new Date(), i);
      return {
        name: format(d, 'MMM'),
        fullName: format(d, 'MMM yyyy'),
        revenue: 0
      };
    }).reverse();

    (transactions || []).forEach(t => {
      if (t.status === 'Released' && t.releasedAt) {
        const date = toDate(t.releasedAt);
        const monthStr = format(date, 'MMM yyyy');
        const monthData = months.find(m => m.fullName === monthStr);
        if (monthData) {
          const commission = t.commission || 0;
          const fee = t.jobGiverFee || 0;
          monthData.revenue += (commission + fee);
        }
      }
    });

    const jobCounts = (allJobs || []).reduce((acc, job) => {
      acc[job.status] = (acc[job.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const jobHealthData = Object.entries(jobCounts).map(([status, count]) => ({
      name: status,
      value: count,
      color: status === 'Completed' ? '#00C49F' : status === 'In Progress' ? '#0088FE' : status === 'Open for Bidding' ? '#FFBB28' : '#FF8042'
    }));

    return { revenueData: months, jobHealthData };
  }, [allJobs, transactions]);

  const totalRevenue = revenueData.reduce((acc, m) => acc + m.revenue, 0);

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Welcome, Admin!</h1>
      <div className="space-y-6">
        <FinancialSummaryCard transactions={transactions} />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Total Users" value={stats.totalUsers} icon={Users} href="/dashboard/users" iconBgColor="bg-blue-500" iconColor="text-white" />
          <StatCard title="Total Jobs" value={stats.totalJobs} icon={Briefcase} href="/dashboard/all-jobs" iconBgColor="bg-purple-500" iconColor="text-white" />
          <StatCard title="Open Disputes" value={stats.openDisputes} icon={AlertOctagon} href="/dashboard/disputes" iconBgColor="bg-red-500" iconColor="text-white" />
          <StatCard title="Value Released" value={`₹${stats.totalValueReleased.toLocaleString()}`} icon={IndianRupee} href="/dashboard/transactions" iconBgColor="bg-green-500" iconColor="text-white" />
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <MetricChartCard title="Platform Net Revenue" description="Commissions + Fees (Last 6 Months)" className="lg:col-span-2">
            <div className="flex flex-col h-full">
              <div className="mb-4">
                <span className="text-3xl font-bold text-green-600">₹{totalRevenue.toLocaleString()}</span>
                <span className="text-sm text-muted-foreground ml-2">Total Net Revenue (Period)</span>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={(val) => `₹${val}`} />
                  <Tooltip formatter={(val) => `₹${Number(val).toLocaleString()}`} labelStyle={{ color: 'black' }} />
                  <Area type="monotone" dataKey="revenue" stroke="#10b981" fillOpacity={1} fill="url(#colorRevenue)" name="Net Revenue" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </MetricChartCard>

          <MetricChartCard title="System Health" description="All Jobs Status Distribution">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={jobHealthData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {jobHealthData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </MetricChartCard>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="col-span-1">
            {/* Recent Signups or Activity - simplified to Card structure for safety */}
            <Card>
              <CardHeader><CardTitle>Recent Signups</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[...allUsers].sort((a, b) => toDate(b.memberSince).getTime() - toDate(a.memberSince).getTime()).slice(0, 5).filter(u => u.id).map((u, index) => (
                    <div key={u.id || `user-${index}`} className="flex items-center gap-4">
                      <Avatar className="h-8 w-8"><AnimatedAvatar svg={u.avatarUrl} /></Avatar>
                      <div><p className="text-sm font-medium">{u.name || 'Unknown User'}</p><p className="text-xs text-muted-foreground">{u.roles?.join(', ') || 'User'}</p></div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-2">
            <TopPerformersCard installers={(allUsers || []).filter(u => Array.isArray(u.roles) && u.roles.includes('Installer'))} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>User Growth</CardTitle>
              <CardDescription>New users in the last 6 months.</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={userGrowthData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Installers" stackId="a" fill="hsl(var(--primary))" />
                  <Bar dataKey="Job Givers" stackId="a" fill="hsl(var(--secondary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function SupportTeamDashboard() {
  const { user } = useUser();
  const { db } = useFirebase();
  const { setHelp } = useHelp();
  const [stats, setStats] = React.useState({ openDisputes: 0, underReviewDisputes: 0 });
  const [disputes, setDisputes] = React.useState<Dispute[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function fetchData() {
      if (!user || !db) return;
      setLoading(true);

      const disputesRef = collection(db, "disputes");

      const openQuery = query(disputesRef, where('status', '==', 'Open'));
      const reviewQuery = query(disputesRef, where('status', '==', 'Under Review'));

      const [openSnapshot, reviewSnapshot] = await Promise.all([
        getDocs(openQuery),
        getDocs(reviewQuery),
      ]);

      const involvedDisputesQuery = query(disputesRef, where('handledBy', '==', user.id));
      const involvedSnapshot = await getDocs(involvedDisputesQuery);
      const handledDisputes = involvedSnapshot.docs.map(d => d.data() as Dispute);

      setDisputes(handledDisputes);

      setStats({
        openDisputes: openSnapshot.size,
        underReviewDisputes: reviewSnapshot.size,
      });

      setLoading(false);
    }
    fetchData();
  }, [user, db]);

  React.useEffect(() => {
    setHelp({
      title: 'Support Dashboard Guide',
      content: (
        <div className="space-y-4 text-sm">
          <p>Welcome to the Support Dashboard. Your primary focus is to manage and resolve user disputes.</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <span className="font-semibold">Open Disputes:</span> These are new cases that require your immediate attention.
            </li>
            <li>
              <span className="font-semibold">Under Review:</span> These are disputes you are actively investigating.
            </li>
            <li>
              <span className="font-semibold">Performance:</span> This card shows your personal dispute resolution metrics, helping you track your progress.
            </li>
          </ul>
          <p>Click on the stat cards to navigate to the Dispute Center and start resolving cases.</p>
        </div>
      )
    });
  }, [setHelp]);

  if (loading) {
    return <div className="flex h-48 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
  }

  return (
    <>
      <div className="flex items-center mb-8">
        <h1 className="text-lg font-semibold md:text-2xl">Support Dashboard</h1>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <StatCard
          title="Open Disputes"
          value={stats.openDisputes}
          description="New cases requiring attention"
          icon={AlertOctagon}
          href="/dashboard/disputes"
          iconBgColor="bg-red-100 dark:bg-red-900"
          iconColor="text-red-600 dark:text-red-300"
        />
        <StatCard
          title="Under Review"
          value={stats.underReviewDisputes}
          description="Disputes you are investigating"
          icon={MessageSquare}
          href="/dashboard/disputes?status=Under+Review"
          iconBgColor="bg-yellow-100 dark:bg-yellow-900"
          iconColor="text-yellow-600 dark:text-yellow-300"
        />
      </div>
      <div className="mt-8 grid gap-8">
        {disputes.length > 0 && <DisputePerformanceCard disputes={disputes} />}
        <Card>
          <CardHeader>
            <CardTitle>Dispute Center</CardTitle>
            <CardDescription>
              Review, manage, and resolve all user-submitted disputes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/dashboard/disputes">
                Go to Disputes <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function renderDashboard(role: Role) {
  switch (role) {
    case "Admin":
      return <AdminDashboard />;
    case "Support Team":
      return <SupportTeamDashboard />;
    case "Installer":
      return <InstallerDashboard />;
    case "Job Giver":
      return <JobGiverDashboard />;
    default:
      return <JobGiverDashboard />; // Default fallback
  }
}

export default function DashboardClient() {
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
      {renderDashboard(role as Role)}
    </>
  );
}
