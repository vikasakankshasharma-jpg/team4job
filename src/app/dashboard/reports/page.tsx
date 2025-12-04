
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
import { Loader2, Users, Briefcase, IndianRupee, PieChart, Download, Award, Star, Calendar, Medal, Bot, HardDriveDownload, MessageSquare, ShieldCheck, Clock } from "lucide-react";
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, RadialBar, RadialBarChart, PolarGrid, PolarAngleAxis } from "recharts";
import { User, Job, SubscriptionPlan, Transaction, Dispute } from "@/lib/types";
import { collection, getDocs, query, doc, updateDoc } from "firebase/firestore";
import { toDate, exportToCsv } from "@/lib/utils";
import { format, startOfMonth, subMonths, getMonth, getYear, differenceInMilliseconds } from "date-fns";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AnimatedAvatar } from "@/components/ui/animated-avatar";
import { useToast } from "@/hooks/use-toast";
import { rewardTopPerformers } from "@/ai/flows/reward-top-performers";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { type ChartConfig } from "@/components/ui/chart";


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
                        <CardDescription>Installers ranked by performance for {lastMonthName}.</CardDescription>
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
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rankedInstallers.slice(0, 5).map((installer, index) => (
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

function AllTimeLeaderboardCard({ installers }: { installers: User[] }) {
    const [selectedState, setSelectedState] = useState<string>('all');
    const [selectedCity, setSelectedCity] = useState<string>('all');
    const [selectedPincode, setSelectedPincode] = useState<string>('all');

    const locationData = useMemo(() => {
        const states = new Set<string>();
        const citiesByState: Record<string, Set<string>> = {};
        const pincodesByCity: Record<string, Set<string>> = {};

        installers.forEach(installer => {
            if (installer.address.fullAddress) {
                const parts = installer.address.fullAddress.split(', ');
                const pincode = installer.address.cityPincode.split(',')[0].trim();
                
                if (parts.length >= 3) {
                    const city = parts[parts.length - 2];
                    const state = parts[parts.length - 1];

                    if(state && city) {
                        states.add(state);
                        if (!citiesByState[state]) citiesByState[state] = new Set();
                        citiesByState[state].add(city);
                        
                        const cityKey = `${state}-${city}`;
                        if (!pincodesByCity[cityKey]) pincodesByCity[cityKey] = new Set();
                        if (pincode) pincodesByCity[cityKey].add(pincode);
                    }
                }
            }
        });
        
        return {
            states: Array.from(states).sort(),
            citiesByState: Object.fromEntries(Object.entries(citiesByState).map(([k, v]) => [k, Array.from(v).sort()])),
            pincodesByCity: Object.fromEntries(Object.entries(pincodesByCity).map(([k, v]) => [k, Array.from(v).sort()]))
        };
    }, [installers]);
    
    useEffect(() => {
        setSelectedCity('all');
        setSelectedPincode('all');
    }, [selectedState]);

    useEffect(() => {
        setSelectedPincode('all');
    }, [selectedCity]);

    const filteredInstallers = useMemo(() => {
        let result = installers;

        if (selectedState !== 'all') {
            result = result.filter(u => u.address.fullAddress?.includes(selectedState));
        }
        if (selectedCity !== 'all') {
             result = result.filter(u => u.address.fullAddress?.includes(selectedCity));
        }
        if (selectedPincode !== 'all') {
             result = result.filter(u => u.address.cityPincode.startsWith(selectedPincode));
        }

        return result.sort((a, b) => (b.installerProfile?.points || 0) - (a.installerProfile?.points || 0));

    }, [installers, selectedState, selectedCity, selectedPincode]);

    const topInstallersForChart = filteredInstallers.slice(0, 10);
    
    const handleDownload = () => {
        if (filteredInstallers.length === 0) {
            alert('No data to export for the current filter.');
            return;
        }

        const dataToExport = filteredInstallers.map(u => ({
            id: u.id,
            name: u.name,
            email: u.email,
            mobile: u.mobile,
            tier: u.installerProfile?.tier || 'N/A',
            points: u.installerProfile?.points || 0,
            rating: u.installerProfile?.rating || 0,
            reviews: u.installerProfile?.reviews || 0,
            verified: u.installerProfile?.verified ? 'Yes' : 'No',
            fullAddress: u.address.fullAddress || '',
            residentialPincode: u.pincodes.residential || '',
            officePincode: u.pincodes.office || '',
        }));

        const stateName = selectedState === 'all' ? 'all-states' : selectedState.replace(' ','-');
        const cityName = selectedCity === 'all' ? 'all-cities' : selectedCity.replace(' ','-');
        const pincodeName = selectedPincode === 'all' ? 'all-pincodes' : selectedPincode;
        
        const filename = `installers-report-${stateName}-${cityName}-${pincodeName}.csv`;
        exportToCsv(filename, dataToExport);
    }

    const citiesForState = selectedState !== 'all' ? locationData.citiesByState[selectedState] || [] : [];
    const pincodesForCity = selectedState !== 'all' && selectedCity !== 'all' ? locationData.pincodesByCity[`${selectedState}-${selectedCity}`] || [] : [];

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <CardTitle>All-Time Reputation Leaderboard</CardTitle>
                        <CardDescription>Top installers by total reputation points, with geographic filters.</CardDescription>
                    </div>
                     <Button onClick={handleDownload} variant="outline" size="sm">
                        <Download className="mr-2 h-4 w-4" />
                        Download Report
                    </Button>
                </div>
                 <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
                    <Select value={selectedState} onValueChange={setSelectedState}>
                        <SelectTrigger><SelectValue placeholder="Filter by State" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All States</SelectItem>
                            {locationData.states.map(state => <SelectItem key={state} value={state}>{state}</SelectItem>)}
                        </SelectContent>
                    </Select>
                     <Select value={selectedCity} onValueChange={setSelectedCity} disabled={selectedState === 'all'}>
                        <SelectTrigger><SelectValue placeholder="Filter by City" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Cities</SelectItem>
                            {citiesForState.map(city => <SelectItem key={city} value={city}>{city}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Select value={selectedPincode} onValueChange={setSelectedPincode} disabled={selectedCity === 'all'}>
                        <SelectTrigger><SelectValue placeholder="Filter by Pincode" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Pincodes</SelectItem>
                            {pincodesForCity.map(pincode => <SelectItem key={pincode} value={pincode}>{pincode}</SelectItem>)}
                        </SelectContent>
                    </Select>
                 </div>
            </CardHeader>
            <CardContent>
                {topInstallersForChart.length > 0 ? (
                    <ResponsiveContainer width="100%" height={350}>
                        <BarChart data={topInstallersForChart} layout="vertical" margin={{ left: 10, right: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis type="number" />
                            <YAxis type="category" dataKey="name" width={80} stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                            <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} />
                            <Legend />
                            <Bar dataKey="installerProfile.points" name="Total Points" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex items-center justify-center h-[350px]">
                        <p className="text-muted-foreground">No installers found for the selected filters.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function DataExportCard({ users, jobs, transactions, disputes }: { users: User[], jobs: Job[], transactions: Transaction[], disputes: Dispute[] }) {
    const { toast } = useToast();
    const [exporting, setExporting] = useState<string | null>(null);

    const handleExport = (dataType: 'users' | 'jobs' | 'transactions' | 'disputes') => {
        setExporting(dataType);
        try {
            let data: any[] = [];
            let filename = `cctv-export-${dataType}-${new Date().toISOString().split('T')[0]}.csv`;

            switch(dataType) {
                case 'users':
                    data = users.map(u => ({
                        id: u.id,
                        name: u.name,
                        email: u.email,
                        mobile: u.mobile,
                        roles: u.roles.join(', '),
                        status: u.status || 'active',
                        memberSince: format(toDate(u.memberSince), 'yyyy-MM-dd'),
                        pincode: u.pincodes.residential,
                        installerTier: u.installerProfile?.tier || 'N/A',
                        installerPoints: u.installerProfile?.points || 0,
                        installerRating: u.installerProfile?.rating || 0,
                    }));
                    break;
                case 'jobs':
                    data = jobs;
                    break;
                case 'transactions':
                    data = transactions;
                    break;
                case 'disputes':
                    data = disputes;
                    break;
            }
            
            if (data.length === 0) {
                toast({ title: "No Data", description: `There is no data to export for ${dataType}.`, variant: "destructive" });
                return;
            }
            exportToCsv(filename, data);
            toast({ title: "Export Successful", description: `${data.length} records exported for ${dataType}.` });
        } catch(error) {
            console.error(`Failed to export ${dataType}:`, error);
            toast({ title: "Export Failed", description: "An error occurred during the export.", variant: "destructive" });
        } finally {
            setExporting(null);
        }
    };

    const ExportButton = ({ type }: { type: 'users' | 'jobs' | 'transactions' | 'disputes' }) => (
        <Button onClick={() => handleExport(type)} disabled={!!exporting}>
            {exporting === type ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Export All {type.charAt(0).toUpperCase() + type.slice(1)}
        </Button>
    );

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><HardDriveDownload /> Data Export</CardTitle>
                <CardDescription>Download a full CSV backup of your platform's core data collections.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <ExportButton type="users" />
                <ExportButton type="jobs" />
                <ExportButton type="transactions" />
                <ExportButton type="disputes" />
            </CardContent>
        </Card>
    );
}

function DisputeResolutionReport({ disputes }: { disputes: Dispute[] }) {
    const report = useMemo(() => {
        const totalDisputes = disputes.length;
        if (totalDisputes === 0) return null;

        const resolvedDisputes = disputes.filter(d => d.status === 'Resolved');
        const resolutionRate = (resolvedDisputes.length / totalDisputes) * 100;

        const totalResolutionTime = resolvedDisputes
            .filter(d => d.createdAt && d.resolvedAt)
            .reduce((acc, d) => acc + differenceInMilliseconds(toDate(d.resolvedAt!), toDate(d.createdAt)), 0);
        
        const avgResolutionTimeDays = resolvedDisputes.length > 0
            ? (totalResolutionTime / resolvedDisputes.length) / (1000 * 60 * 60 * 24)
            : 0;

        const categoryCounts = disputes.reduce((acc, d) => {
            acc[d.category] = (acc[d.category] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const categoryData = Object.entries(categoryCounts).map(([name, value]) => ({ name, value }));

        return {
            resolutionRate,
            avgResolutionTimeDays,
            categoryData,
        };
    }, [disputes]);

    if (!report) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Dispute Resolution Report</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-[300px]">
                    <p className="text-muted-foreground">No dispute data available.</p>
                </CardContent>
            </Card>
        );
    }
    
    const performanceChartConfig = {
      value: { label: 'Resolved' },
      fill: {
        label: "Fill",
        color: "hsl(var(--primary) / 0.2)",
      },
    } satisfies ChartConfig;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Dispute Resolution Report</CardTitle>
                <CardDescription>An overview of support ticket performance.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
                <div className="grid grid-cols-2 gap-4">
                    <Card className="flex flex-col items-center justify-center p-4 text-center">
                        <ShieldCheck className="h-6 w-6 mb-2 text-green-600" />
                        <p className="text-2xl font-bold">{report.resolutionRate.toFixed(0)}%</p>
                        <p className="text-sm text-muted-foreground">Resolution Rate</p>
                    </Card>
                    <Card className="flex flex-col items-center justify-center p-4 text-center">
                        <Clock className="h-6 w-6 mb-2 text-amber-500" />
                        <p className="text-2xl font-bold">{report.avgResolutionTimeDays.toFixed(1)}</p>
                        <p className="text-sm text-muted-foreground">Avg. Days to Resolve</p>
                    </Card>
                </div>
                <div>
                     <h4 className="text-sm font-medium mb-2">Disputes by Category</h4>
                     <ResponsiveContainer width="100%" height={150}>
                        <BarChart data={report.categoryData} layout="vertical" margin={{ left: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis type="number" />
                            <YAxis type="category" dataKey="name" width={100} fontSize={12} tickLine={false} axisLine={false} />
                            <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} />
                            <Bar dataKey="value" name="Count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    )
}

function FinancialSummaryCard({ transactions }: { transactions: Transaction[] }) {
    const summary = useMemo(() => {
        return transactions.reduce((acc, t) => {
            if (t.status === 'Released') {
                acc.totalReleased += t.payoutToInstaller;
                acc.platformRevenue += t.commission + t.jobGiverFee;
                acc.payoutsCount++;
            }
            if (t.status === 'Funded') {
                acc.fundsHeld += t.totalPaidByGiver;
            }
            if (t.status === 'Funded' || t.status === 'Released') {
                 acc.totalVolume += t.totalPaidByGiver;
            }
             if (t.status === 'Refunded') {
                acc.refundsCount++;
            }
            return acc;
        }, {
            totalVolume: 0,
            totalReleased: 0,
            platformRevenue: 0,
            payoutsCount: 0,
            refundsCount: 0,
            fundsHeld: 0,
        });
    }, [transactions]);
    
    return (
        <Card className="col-span-full">
            <CardHeader>
                <CardTitle>Financial Summary</CardTitle>
                <CardDescription>A real-time overview of financial activities on the platform.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
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
                <Card className="p-4">
                    <p className="text-sm font-medium">Refunds Processed</p>
                    <p className="text-2xl font-bold">{summary.refundsCount}</p>
                </Card>
            </CardContent>
        </Card>
    )
}


export default function ReportsPage() {
  const { isAdmin, loading: userLoading } = useUser();
  const { db } = useFirebase();
  const router = useRouter();
  const [users, setUsers] = React.useState<User[]>([]);
  const [jobs, setJobs] = React.useState<Job[]>([]);
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [disputes, setDisputes] = React.useState<Dispute[]>([]);
  const [loading, setLoading] = React.useState(true);

  useEffect(() => {
    if (!userLoading && !isAdmin) {
      router.push('/dashboard');
    }
  }, [isAdmin, userLoading, router]);

  const fetchData = React.useCallback(async () => {
    if (!db || !isAdmin) return;
    setLoading(true);
    const [usersSnapshot, jobsSnapshot, transactionsSnapshot, disputesSnapshot] = await Promise.all([
        getDocs(query(collection(db, "users"))),
        getDocs(query(collection(db, "jobs"))),
        getDocs(query(collection(db, "transactions"))),
        getDocs(query(collection(db, "disputes"))),
    ]);
    setUsers(usersSnapshot.docs.map(doc => doc.data() as User));
    setJobs(jobsSnapshot.docs.map(doc => doc.data() as Job));
    setTransactions(transactionsSnapshot.docs.map(doc => doc.data() as Transaction));
    setDisputes(disputesSnapshot.docs.map(doc => doc.data() as Dispute));
    setLoading(false);
  }, [db, isAdmin]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);


  const reportData = useMemo(() => {
    if (users.length === 0 && jobs.length === 0) return null;

    const totalUsers = users.length;
    const installerCount = users.filter(u => u.roles.includes("Installer")).length;
    const jobGiverCount = users.filter(u => u.roles.includes("Job Giver")).length;

    const totalJobs = jobs.length;
    const completedJobs = jobs.filter(j => j.status === 'Completed');
    const fillRate = totalJobs > 0 ? (completedJobs.length / totalJobs) * 100 : 0;

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

    const allInstallers = users.filter(u => u.installerProfile);

    return {
        totalUsers,
        installerCount,
        jobGiverCount,
        totalJobs,
        fillRate,
        userGrowthData,
        jobStatusData,
        allInstallers,
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
  
  const { totalUsers, installerCount, jobGiverCount, totalJobs, fillRate, userGrowthData, jobStatusData, allInstallers } = reportData;

  return (
    <div className="grid gap-6">
      <CardHeader className="p-0">
        <CardTitle>Platform Reports</CardTitle>
        <CardDescription>An overview of key metrics and trends across the platform.</CardDescription>
      </CardHeader>
      
      <FinancialSummaryCard transactions={transactions} />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <KpiCard title="Total Users" value={totalUsers} description={`${installerCount} Installers, ${jobGiverCount} Job Givers`} icon={Users} iconBgColor="bg-blue-500" />
        <KpiCard title="Total Jobs" value={totalJobs} description="All jobs created on the platform" icon={Briefcase} iconBgColor="bg-purple-500" />
        <KpiCard title="Job Fill Rate" value={`${fillRate.toFixed(1)}%`} description="Of jobs posted are completed" icon={PieChart} iconBgColor="bg-amber-500" />
      </div>

      <DataExportCard users={users} jobs={jobs} transactions={transactions} disputes={disputes} />

      <div className="grid gap-6 lg:grid-cols-2">
        <TopPerformersCard installers={allInstallers} />
        <AllTimeLeaderboardCard installers={allInstallers} />
      </div>
      
      <DisputeResolutionReport disputes={disputes} />

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
                    <Bar dataKey="value" name="Number of Jobs" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
