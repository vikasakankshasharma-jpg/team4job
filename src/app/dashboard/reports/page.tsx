
"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useUser, useFirebase } from "@/hooks/use-user";
import { useRouter } from "next/navigation";
import { Loader2, Users, Briefcase, IndianRupee, PieChart, Download, Award, Star, Calendar, Medal, Bot } from "lucide-react";
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from "recharts";
import { User, Job, SubscriptionPlan } from "@/lib/types";
import { collection, getDocs, query, doc, updateDoc } from "firebase/firestore";
import { toDate, exportToCsv } from "@/lib/utils";
import { format, startOfMonth, subMonths, getMonth, getYear } from "date-fns";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AnimatedAvatar } from "@/components/ui/animated-avatar";
import { useToast } from "@/hooks/use-toast";
import { rewardTopPerformers } from "@/ai/flows/reward-top-performers";

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

const tierIcons: Record<string, React.ReactNode> = {
  Bronze: <Medal className="h-4 w-4 text-yellow-700" />,
  Silver: <Medal className="h-4 w-4 text-gray-400" />,
  Gold: <Award className="h-4 w-4 text-amber-500" />,
  Platinum: <Award className="h-4 w-4 text-cyan-400" />,
};

interface MonthlyPerformance extends User {
    monthlyPoints: number;
}

function TopPerformersCard({ installers }: { installers: User[] }) {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    const rankedInstallers = useMemo(() => {
        const now = new Date();
        const lastMonthDate = subMonths(now, 1);
        const lastMonth = getMonth(lastMonthDate);
        const lastMonthYear = getYear(lastMonthDate);

        const twoMonthsAgoDate = subMonths(now, 2);
        const twoMonthsAgo = getMonth(twoMonthsAgoDate);
        const twoMonthsAgoYear = getYear(twoMonthsAgoDate);
        
        return installers
            .map(installer => {
                const history = installer.installerProfile?.reputationHistory || [];
                const lastMonthEntry = history.find(h => {
                    const [month, year] = h.month.split(' ');
                    const monthIndex = new Date(Date.parse(month +" 1, 2012")).getMonth();
                    return monthIndex === lastMonth && parseInt(year) === lastMonthYear;
                });
                const twoMonthsAgoEntry = history.find(h => {
                     const [month, year] = h.month.split(' ');
                    const monthIndex = new Date(Date.parse(month +" 1, 2012")).getMonth();
                    return monthIndex === twoMonthsAgo && parseInt(year) === twoMonthsAgoYear;
                });

                const lastMonthPoints = lastMonthEntry?.points || 0;
                const twoMonthsAgoPoints = twoMonthsAgoEntry?.points || 0;

                const monthlyPoints = Math.max(0, lastMonthPoints - twoMonthsAgoPoints);
                
                return { ...installer, monthlyPoints };
            })
            .sort((a, b) => {
                // 1. Sort by monthly points (descending)
                if (b.monthlyPoints !== a.monthlyPoints) {
                    return b.monthlyPoints - a.monthlyPoints;
                }
                // 2. Sort by rating (descending)
                if ((b.installerProfile?.rating || 0) !== (a.installerProfile?.rating || 0)) {
                    return (b.installerProfile?.rating || 0) - (a.installerProfile?.rating || 0);
                }
                // 3. Sort by memberSince (oldest first, so ascending)
                return toDate(a.memberSince).getTime() - toDate(b.memberSince).getTime();
            });
    }, [installers]);
    
    const handleRunAutomation = async () => {
        setIsLoading(true);
        try {
            const result = await rewardTopPerformers({});
            toast({
                title: "Automation Complete!",
                description: result.summary,
                variant: 'success',
            });
        } catch (error: any) {
            console.error("Failed to run automation:", error);
            toast({
                title: "Automation Error",
                description: error.message || "Could not grant rewards. Please try again.",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    }
    
    const lastMonthName = format(subMonths(new Date(), 1), 'MMMM yyyy');

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <CardTitle>Top Performers Report</CardTitle>
                        <CardDescription>Installers ranked by performance for {lastMonthName}. Click the button to automatically reward the top 3.</CardDescription>
                    </div>
                    <Button onClick={handleRunAutomation} disabled={isLoading}>
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bot className="mr-2 h-4 w-4" />}
                        Run Monthly Reward Automation
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Rank</TableHead>
                            <TableHead>Installer</TableHead>
                            <TableHead>Monthly Points</TableHead>
                            <TableHead>Rating</TableHead>
                            <TableHead>Pincode</TableHead>
                            <TableHead>Member Since</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rankedInstallers.slice(0, 10).map((installer, index) => (
                           <TableRow key={installer.id} className={index < 3 ? "bg-primary/5" : ""}>
                               <TableCell className="font-bold text-lg">{index + 1}</TableCell>
                               <TableCell>
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-9 w-9 hidden sm:flex">
                                            <AnimatedAvatar svg={installer.avatarUrl} />
                                            <AvatarFallback>{installer.name.substring(0, 2)}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-medium">{installer.name}</p>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                {tierIcons[installer.installerProfile?.tier || 'Bronze']}
                                                <span>{installer.installerProfile?.tier} Tier</span>
                                            </div>
                                        </div>
                                    </div>
                               </TableCell>
                               <TableCell className="font-semibold text-green-600">+{installer.monthlyPoints} pts</TableCell>
                               <TableCell>
                                    <div className="flex items-center gap-1">
                                        <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                                        <span>{installer.installerProfile?.rating.toFixed(1)}</span>
                                    </div>
                               </TableCell>
                                <TableCell>{installer.pincodes.residential}</TableCell>
                               <TableCell>{format(toDate(installer.memberSince), 'MMM dd, yyyy')}</TableCell>
                           </TableRow>
                        ))}
                    </TableBody>
                </Table>
                 {rankedInstallers.length === 0 && (
                    <p className="text-center py-8 text-muted-foreground">Not enough data to generate performance report.</p>
                )}
            </CardContent>
        </Card>
    );
}


export default function ReportsPage() {
  const { isAdmin, loading: userLoading } = useUser();
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

  const fetchData = React.useCallback(async () => {
    if (!db || !isAdmin) return;
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
  }, [db, isAdmin]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);


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
                // Assuming 10% from installer and 2% from job giver. This should be dynamic in a real app.
                platformRevenue += winningBid.amount * 0.12; 
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
        if (joinDate > subMonths(now, 6)) {
            const monthName = format(joinDate, 'MMM');
            const monthData = userGrowthData.find(m => m.name === monthName);
            if (monthData) {
                if (user.roles.includes('Installer')) monthData.Installers++;
                if (user.roles.includes('Job Giver')) monthData["Job Givers"]++;
            }
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
        allInstallers: users.filter(u => u.installerProfile),
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
  
  const { totalUsers, installerCount, jobGiverCount, totalJobs, fillRate, platformRevenue, userGrowthData, jobStatusData, topInstallers, allInstallers } = reportData;

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

       <TopPerformersCard installers={allInstallers} />

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
    </div>
  );
}
