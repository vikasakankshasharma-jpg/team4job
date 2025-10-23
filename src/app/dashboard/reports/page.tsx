
"use client";

import React, { useEffect, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useUser, useFirebase } from "@/hooks/use-user";
import { useRouter } from "next/navigation";
import { Loader2, Users, Briefcase, IndianRupee, PieChart, Download } from "lucide-react";
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from "recharts";
import { User, Job } from "@/lib/types";
import { collection, getDocs, query } from "firebase/firestore";
import { toDate, exportToCsv } from "@/lib/utils";
import { format, startOfMonth, subMonths } from "date-fns";
import { Button } from "@/components/ui/button";

function KpiCard({ title, value, description, icon: Icon, iconBgColor }) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <div className={`p-2 rounded-full ${iconBgColor}`}>
                    <Icon className="h-4 w-4 text-primary-foreground" />
                </div>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                <p className="text-xs text-muted-foreground">{description}</p>
            </CardContent>
        </Card>
    );
}

export default function ReportsPage() {
  const { user, isAdmin, loading: userLoading } = useUser();
  const { db } = useFirebase();
  const router = useRouter();
  const [users, setUsers] = React.useState<User[]>([]);
  const [jobs, setJobs] = React.useState<Job[]>([]);
  const [loading, setLoading] = React.useState(true);

  useEffect(() => {
    if (!userLoading && !isAdmin) {
      router.push('/dashboard');
    }
  }, [isAdmin, userLoading, router]);

  useEffect(() => {
    if (!db || !isAdmin) return;
    async function fetchData() {
        setLoading(true);
        const usersQuery = query(collection(db, "users"));
        const jobsQuery = query(collection(db, "jobs"));
        const [usersSnapshot, jobsSnapshot] = await Promise.all([
            getDocs(usersQuery),
            getDocs(jobsQuery),
        ]);
        setUsers(usersSnapshot.docs.map(doc => doc.data() as User));
        setJobs(jobsSnapshot.docs.map(doc => doc.data() as Job));
        setLoading(false);
    }
    fetchData();
  }, [db, isAdmin]);

  const reportData = useMemo(() => {
    if (users.length === 0 || jobs.length === 0) return null;

    const totalUsers = users.length;
    const installerCount = users.filter(u => u.roles.includes("Installer")).length;
    const jobGiverCount = users.filter(u => u.roles.includes("Job Giver")).length;

    const totalJobs = jobs.length;
    const completedJobs = jobs.filter(j => j.status === 'Completed');
    const fillRate = totalJobs > 0 ? (completedJobs.length / totalJobs) * 100 : 0;
    
    let platformRevenue = 0;
    completedJobs.forEach(job => {
        if (job.awardedInstaller) {
            const winningBid = (job.bids || []).find(bid => (bid.installer as any)?.id === (job.awardedInstaller as any)?.id);
            if (winningBid) {
                platformRevenue += winningBid.amount * 0.12; // 10% from installer, 2% from job giver
            }
        }
    });

    const now = new Date();
    const userGrowthData = Array.from({ length: 6 }).map((_, i) => {
        const monthDate = subMonths(startOfMonth(now), i);
        const monthName = format(monthDate, 'MMM');
        return {
            name: monthName,
            Installers: 0,
            "Job Givers": 0,
        };
    }).reverse();

    users.forEach(user => {
        const joinDate = toDate(user.memberSince);
        const monthIndex = 5 - (now.getMonth() - joinDate.getMonth() + 12 * (now.getFullYear() - joinDate.getFullYear()));
        if (monthIndex >= 0 && monthIndex < 6) {
            if (user.roles.includes('Installer')) userGrowthData[monthIndex].Installers++;
            if (user.roles.includes('Job Giver')) userGrowthData[monthIndex]["Job Givers"]++;
        }
    });

    const jobStatusDistribution = jobs.reduce((acc, job) => {
        acc[job.status] = (acc[job.status] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    const jobStatusData = Object.entries(jobStatusDistribution).map(([name, value]) => ({ name, value }));

    const topInstallers = users
        .filter(u => u.installerProfile)
        .sort((a, b) => (b.installerProfile?.points || 0) - (a.installerProfile?.points || 0))
        .slice(0, 5)
        .map(u => ({ name: u.name, points: u.installerProfile?.points || 0 }));

    return {
        totalUsers,
        installerCount,
        jobGiverCount,
        totalJobs,
        fillRate,
        platformRevenue,
        userGrowthData,
        jobStatusData,
        topInstallers,
    };
  }, [users, jobs]);

  if (userLoading || !isAdmin || loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!reportData) {
      return <p>No data available to generate reports.</p>
  }
  
  const { totalUsers, installerCount, jobGiverCount, totalJobs, fillRate, platformRevenue, userGrowthData, jobStatusData, topInstallers } = reportData;

  return (
    <div className="grid gap-6">
      <CardHeader className="p-0">
        <CardTitle>Platform Reports</CardTitle>
        <CardDescription>An overview of key metrics and trends across the platform.</CardDescription>
      </CardHeader>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Total Users" value={totalUsers} description={`${installerCount} Installers, ${jobGiverCount} Job Givers`} icon={Users} iconBgColor="bg-blue-500" />
        <KpiCard title="Total Jobs" value={totalJobs} description="All jobs created on the platform" icon={Briefcase} iconBgColor="bg-purple-500" />
        <KpiCard title="Platform Revenue (Simulated)" value={`₹${platformRevenue.toLocaleString()}`} description="Based on a 12% commission" icon={IndianRupee} iconBgColor="bg-green-500" />
        <KpiCard title="Job Fill Rate" value={`${fillRate.toFixed(1)}%`} description="Of jobs posted are completed" icon={PieChart} iconBgColor="bg-amber-500" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>User Growth</CardTitle>
            <CardDescription>New users registered in the last 6 months.</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={userGrowthData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="Installers" stackId="1" stroke="#8884d8" fill="#8884d8" />
                <Area type="monotone" dataKey="Job Givers" stackId="1" stroke="#82ca9d" fill="#82ca9d" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Job Status Distribution</CardTitle>
            <CardDescription>Current status of all jobs on the platform.</CardDescription>
          </CardHeader>
          <CardContent>
             <ResponsiveContainer width="100%" height={300}>
                <BarChart data={jobStatusData} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="name" width={120} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="value" name="Number of Jobs" fill="#8884d8" />
                </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
            <CardTitle>Top Performing Installers</CardTitle>
            <CardDescription>Ranked by total reputation points.</CardDescription>
        </CardHeader>
        <CardContent>
             <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topInstallers} margin={{ right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="points" fill="#82ca9d" />
                </BarChart>
            </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
