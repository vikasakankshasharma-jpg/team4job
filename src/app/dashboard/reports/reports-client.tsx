
"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { collection, getDocs, query, doc, updateDoc, where, Timestamp, orderBy, limit } from "firebase/firestore";
import { toDate, exportToCsv, calculateMonthlyPerformance, RankedInstaller } from "@/lib/utils";
import { format, startOfMonth, subMonths, getMonth, getYear, differenceInMilliseconds } from "date-fns";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AnimatedAvatar } from "@/components/ui/animated-avatar";
import { useToast } from "@/hooks/use-toast";
import { rewardTopPerformersAction } from "@/app/actions/ai.actions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { type ChartConfig } from "@/components/ui/chart";
import { ReportsSkeleton } from "@/components/skeletons/reports-skeleton";
import { GlobalErrorBoundary } from "@/components/dashboard/error-boundary";
import { useTranslations } from "next-intl";


interface KpiCardProps {
    title: string;
    value: string | number;
    description: string;
    icon: React.ElementType;
    iconBgColor: string;
}

function KpiCard({ title, value, description, icon: Icon, iconBgColor }: KpiCardProps) {
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

function TopPerformersCard({ installers }: { installers: User[] }) {
    const t = useTranslations('admin.reports');
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    const rankedInstallers: RankedInstaller[] = useMemo(() => {
        return calculateMonthlyPerformance(installers);
    }, [installers]);

    const handleRunAutomation = async () => {
        setIsLoading(true);
        try {
            const result = await rewardTopPerformersAction({});
            if (result.success && result.data && result.data.success) {
                toast({
                    title: t('topPerformers.automation.complete'),
                    description: result.data.summary,
                    variant: 'default',
                });
            } else {
                toast({
                    title: t('topPerformers.automation.failed'),
                    description: result.data?.summary || result.error || t('topPerformers.automation.errorDesc'),
                    variant: 'destructive',
                });
            }
        } catch (error: any) {
            console.error("Failed to run automation:", error);
            toast({
                title: t('topPerformers.automation.error'),
                description: error.message || t('topPerformers.automation.errorDesc'),
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
                        <CardTitle>{t('topPerformers.title')}</CardTitle>
                        <CardDescription>{t('topPerformers.description', { month: lastMonthName })}</CardDescription>
                    </div>
                    <Button onClick={handleRunAutomation} disabled={isLoading}>
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bot className="mr-2 h-4 w-4" />}
                        {t('topPerformers.runAutomation')}
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('topPerformers.rank')}</TableHead>
                                <TableHead>{t('topPerformers.installer')}</TableHead>
                                <TableHead>{t('topPerformers.points')}</TableHead>
                                <TableHead>{t('topPerformers.rating')}</TableHead>
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
                                                    <span>{installer.installerProfile?.tier} {t('topPerformers.tier')}</span>
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
                </div>
                {rankedInstallers.length === 0 && (
                    <p className="text-center py-8 text-muted-foreground">{t('topPerformers.empty')}</p>
                )}
            </CardContent>
        </Card>
    );
}

function AllTimeLeaderboardCard({ installers }: { installers: User[] }) {
    const t = useTranslations('admin.reports');
    const { toast } = useToast();
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

                    if (state && city) {
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
            toast({
                title: t('leaderboard.exportFailed'),
                description: t('leaderboard.exportFailedDesc'),
                variant: "destructive"
            });
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

        const stateName = selectedState === 'all' ? 'all-states' : selectedState.replace(' ', '-');
        const cityName = selectedCity === 'all' ? 'all-cities' : selectedCity.replace(' ', '-');
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
                        <CardTitle>{t('leaderboard.title')}</CardTitle>
                        <CardDescription>{t('leaderboard.description')}</CardDescription>
                    </div>
                    <Button onClick={handleDownload} variant="outline" size="sm">
                        <Download className="mr-2 h-4 w-4" />
                        {t('leaderboard.download')}
                    </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
                    <Select value={selectedState} onValueChange={setSelectedState}>
                        <SelectTrigger><SelectValue placeholder={t('leaderboard.filterState')} /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t('leaderboard.allStates')}</SelectItem>
                            {locationData.states.map(state => <SelectItem key={state} value={state}>{state}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Select value={selectedCity} onValueChange={setSelectedCity} disabled={selectedState === 'all'}>
                        <SelectTrigger><SelectValue placeholder={t('leaderboard.filterCity')} /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t('leaderboard.allCities')}</SelectItem>
                            {citiesForState.map(city => <SelectItem key={city} value={city}>{city}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Select value={selectedPincode} onValueChange={setSelectedPincode} disabled={selectedCity === 'all'}>
                        <SelectTrigger><SelectValue placeholder={t('leaderboard.filterPincode')} /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t('leaderboard.allPincodes')}</SelectItem>
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
                            <Bar dataKey="installerProfile.points" name={t('leaderboard.totalPoints')} fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex items-center justify-center h-[350px]">
                        <p className="text-muted-foreground">{t('leaderboard.empty')}</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function DataExportCard({ users, jobs, transactions, disputes }: { users: User[], jobs: Job[], transactions: Transaction[], disputes: Dispute[] }) {
    const t = useTranslations('admin.reports');
    const { toast } = useToast();
    const [exporting, setExporting] = useState<string | null>(null);

    const handleExport = (dataType: 'users' | 'jobs' | 'transactions' | 'disputes') => {
        setExporting(dataType);
        try {
            let data: any[] = [];
            let filename = `cctv-export-${dataType}-${new Date().toISOString().split('T')[0]}.csv`;

            switch (dataType) {
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
                toast({ title: t('export.noData'), description: t('export.noDataDesc', { type: dataType }), variant: "destructive" });
                return;
            }
            exportToCsv(filename, data);
            toast({ title: t('export.success'), description: t('export.successDesc', { count: data.length, type: dataType }) });
        } catch (error) {
            console.error(`Failed to export ${dataType}:`, error);
            toast({ title: t('export.failed'), description: t('export.failedDesc'), variant: "destructive" });
        } finally {
            setExporting(null);
        }
    };

    const ExportButton = ({ type }: { type: 'users' | 'jobs' | 'transactions' | 'disputes' }) => (
        <Button onClick={() => handleExport(type)} disabled={!!exporting}>
            {exporting === type ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            {t(`export.${type}`)}
        </Button>
    );

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><HardDriveDownload /> {t('export.title')}</CardTitle>
                <CardDescription>{t('export.description')}</CardDescription>
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
    const t = useTranslations('admin.reports');
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
                    <CardTitle>{t('disputes.title')}</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-[300px]">
                    <p className="text-muted-foreground">{t('disputes.empty')}</p>
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
                <CardTitle>{t('disputes.title')}</CardTitle>
                <CardDescription>{t('disputes.description')}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
                <div className="grid grid-cols-2 gap-4">
                    <Card className="flex flex-col items-center justify-center p-4 text-center">
                        <ShieldCheck className="h-6 w-6 mb-2 text-green-600" />
                        <p className="text-2xl font-bold">{report.resolutionRate.toFixed(0)}%</p>
                        <p className="text-sm text-muted-foreground">{t('disputes.resolutionRate')}</p>
                    </Card>
                    <Card className="flex flex-col items-center justify-center p-4 text-center">
                        <Clock className="h-6 w-6 mb-2 text-amber-500" />
                        <p className="text-2xl font-bold">{report.avgResolutionTimeDays.toFixed(1)}</p>
                        <p className="text-sm text-muted-foreground">{t('disputes.avgDays')}</p>
                    </Card>
                </div>
                <div>
                    <h4 className="text-sm font-medium mb-2">{t('disputes.byCategory')}</h4>
                    <ResponsiveContainer width="100%" height={150}>
                        <BarChart data={report.categoryData} layout="vertical" margin={{ left: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis type="number" />
                            <YAxis type="category" dataKey="name" width={100} fontSize={12} tickLine={false} axisLine={false} />
                            <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} />
                            <Bar dataKey="value" name={t('disputes.count')} fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    )
}

function FinancialSummaryCard({ transactions }: { transactions: Transaction[] }) {
    const t = useTranslations('admin.reports');
    const summary = useMemo(() => {
        return transactions.reduce((acc, t) => {
            if (t.status === 'released') {
                acc.totalReleased += t.payoutToInstaller;
                acc.platformRevenue += t.commission + t.jobGiverFee;
                acc.payoutsCount++;
            }
            if (t.status === 'funded') {
                acc.fundsHeld += t.totalPaidByGiver;
            }
            if (t.status === 'funded' || t.status === 'released') {
                acc.totalVolume += t.totalPaidByGiver;
            }
            if (t.status === 'refunded') {
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
                <CardTitle>{t('financial.title')}</CardTitle>
                <CardDescription>{t('financial.description')}</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                <Card className="p-4">
                    <p className="text-sm font-medium">{t('financial.volume')}</p>
                    <p className="text-2xl font-bold">₹{summary.totalVolume.toLocaleString()}</p>
                </Card>
                <Card className="p-4">
                    <p className="text-sm font-medium">{t('financial.revenue')}</p>
                    <p className="text-2xl font-bold text-green-600">₹{summary.platformRevenue.toLocaleString()}</p>
                </Card>
                <Card className="p-4">
                    <p className="text-sm font-medium">{t('financial.released')}</p>
                    <p className="text-2xl font-bold">₹{summary.totalReleased.toLocaleString()}</p>
                </Card>
                <Card className="p-4">
                    <p className="text-sm font-medium">{t('financial.held')}</p>
                    <p className="text-2xl font-bold">₹{summary.fundsHeld.toLocaleString()}</p>
                </Card>
                <Card className="p-4">
                    <p className="text-sm font-medium">{t('financial.refunds')}</p>
                    <p className="text-2xl font-bold">{summary.refundsCount}</p>
                </Card>
            </CardContent>
        </Card>
    )
}


export default function ReportsClient() {
    const t = useTranslations('admin.reports');
    const { isAdmin, loading: userLoading } = useUser();
    const { db } = useFirebase();
    const router = useRouter();
    const queryClient = useQueryClient();

    // React Query Hooks
    const { data: userData = { users: [], installers: [] }, isLoading: usersLoading } = useQuery({
        queryKey: ['reports-users', isAdmin],
        queryFn: async () => {
            if (!db || !isAdmin) return { users: [], installers: [] };
            const usersSnap = await getDocs(query(collection(db, 'users'), limit(1000)));
            const users = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as User);
            return {
                users,
                installers: users.filter(u => u.roles.includes('Installer'))
            };
        },
        enabled: !!db && !!isAdmin,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    const { data: jobs = [], isLoading: jobsLoading } = useQuery({
        queryKey: ['reports-jobs', isAdmin],
        queryFn: async () => {
            if (!db || !isAdmin) return [];
            const ninetyDaysAgo = new Date();
            ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
            const timestampFilter = Timestamp.fromDate(ninetyDaysAgo);

            const jobsSnap = await getDocs(query(
                collection(db, "jobs"),
                where('postedAt', '>=', timestampFilter),
                orderBy('postedAt', 'desc'),
                limit(500)
            ));
            return jobsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Job);
        },
        enabled: !!db && !!isAdmin,
        staleTime: 5 * 60 * 1000,
    });

    const { data: transactions = [], isLoading: transactionsLoading } = useQuery({
        queryKey: ['reports-transactions', isAdmin],
        queryFn: async () => {
            if (!db || !isAdmin) return [];
            const ninetyDaysAgo = new Date();
            ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
            const timestampFilter = Timestamp.fromDate(ninetyDaysAgo);

            const txSnap = await getDocs(query(
                collection(db, "transactions"),
                where('createdAt', '>=', timestampFilter),
                orderBy('createdAt', 'desc'),
                limit(500)
            ));
            return txSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Transaction);
        },
        enabled: !!db && !!isAdmin,
        staleTime: 5 * 60 * 1000,
    });

    const { data: disputes = [], isLoading: disputesLoading } = useQuery({
        queryKey: ['reports-disputes', isAdmin],
        queryFn: async () => {
            if (!db || !isAdmin) return [];
            const ninetyDaysAgo = new Date();
            ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
            const timestampFilter = Timestamp.fromDate(ninetyDaysAgo);

            const dSnap = await getDocs(query(
                collection(db, "disputes"),
                where('createdAt', '>=', timestampFilter),
                orderBy('createdAt', 'desc'),
                limit(200)
            ));
            return dSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Dispute);
        },
        enabled: !!db && !!isAdmin,
        staleTime: 5 * 60 * 1000,
    });

    const loading = usersLoading || jobsLoading || transactionsLoading || disputesLoading;
    const users = userData.users;
    const installers = userData.installers;
    const lastFetchTime = 0; // Removed manual tracking, relied on Query staleness

    useEffect(() => {
        if (!userLoading && !isAdmin) {
            router.push('/dashboard');
        }
    }, [isAdmin, userLoading, router]);


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
        return <ReportsSkeleton />;
    }

    if (!reportData) {
        return <p>No data available to generate reports.</p>
    }

    const { totalUsers, installerCount, jobGiverCount, totalJobs, fillRate, userGrowthData, jobStatusData, allInstallers } = reportData;

    return (
        <GlobalErrorBoundary>
            <div className="grid gap-6 max-w-full overflow-x-hidden px-4">
                <Card className="col-span-full">
                    <CardHeader>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div>
                                <CardTitle>{t('title')}</CardTitle>
                                <CardDescription>
                                    {t('description')}
                                    {lastFetchTime > 0 && (
                                        <span className="text-xs ml-2">
                                            {t('updated', { time: format(new Date(lastFetchTime), 'h:mm a') })}
                                        </span>
                                    )}
                                </CardDescription>
                            </div>
                            <Button
                                onClick={() => {
                                    queryClient.invalidateQueries({ queryKey: ['reports-users'] });
                                    queryClient.invalidateQueries({ queryKey: ['reports-jobs'] });
                                    queryClient.invalidateQueries({ queryKey: ['reports-transactions'] });
                                    queryClient.invalidateQueries({ queryKey: ['reports-disputes'] });
                                }}
                                disabled={loading}
                                variant="outline"
                                size="sm"
                            >
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Clock className="mr-2 h-4 w-4" />}
                                {t('refresh')}
                            </Button>
                        </div>
                    </CardHeader>
                </Card>

                <FinancialSummaryCard transactions={transactions} />

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <KpiCard title={t('kpi.totalUsers')} value={totalUsers} description={t('kpi.usersDesc', { installers: installerCount, givers: jobGiverCount })} icon={Users} iconBgColor="bg-blue-500" />
                    <KpiCard title={t('kpi.totalJobs')} value={totalJobs} description={t('kpi.jobsDesc')} icon={Briefcase} iconBgColor="bg-purple-500" />
                    <KpiCard title={t('kpi.fillRate')} value={`${fillRate.toFixed(1)}%`} description={t('kpi.fillRateDesc')} icon={PieChart} iconBgColor="bg-amber-500" />
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
                            <CardTitle>{t('charts.userGrowth')}</CardTitle>
                            <CardDescription>{t('charts.userGrowthDesc')}</CardDescription>
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
                            <CardTitle>{t('charts.jobStatus')}</CardTitle>
                            <CardDescription>{t('charts.jobStatusDesc')}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={jobStatusData} layout="vertical" margin={{ left: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis type="number" />
                                    <YAxis type="category" dataKey="name" width={120} />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="value" name={t('charts.numberOfJobs')} fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </GlobalErrorBoundary>
    );
}
