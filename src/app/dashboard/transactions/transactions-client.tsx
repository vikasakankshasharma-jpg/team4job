
"use client";

import { useTranslations } from "next-intl";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, IndianRupee, ArrowRight, X, Wallet, CheckCircle2, ShieldEllipsis, Hourglass, Calendar as CalendarIcon, TrendingUp, DollarSign, RefreshCw, CreditCard, Inbox } from "lucide-react";
import { StatCard, FilterBar, ExportButton, AdminEmptyState } from "@/components/admin";
import type { Filter } from "@/components/admin";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUser, useFirebase } from "@/hooks/use-user";
import { useRouter } from "next/navigation";
import { Transaction, User } from "@/lib/types";
import { toDate, cn } from "@/lib/utils";
import { format, formatDistanceToNow, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";
import { collection, getDocs, query, where, or } from "firebase/firestore";
import Link from "next/link";
import { useHelp } from "@/hooks/use-help";
import { DateRange } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MobileTransactionCard } from "@/components/dashboard/transactions/mobile-transaction-card";

const getStatusVariant = (status: Transaction['status']) => {
    switch (status) {
        case 'released': return 'success';
        case 'funded': return 'info';
        case 'refunded': return 'secondary';
        case 'failed': return 'destructive';
        default: return 'outline';
    }
};

const initialFilters = {
    search: "",
    status: "all",
};

export default function TransactionsClient() {
    const { user, isAdmin, loading: userLoading } = useUser();
    // const { db } = useFirebase(); // Unused now
    const router = useRouter();
    const t = useTranslations('transactions');
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState(initialFilters);
    const [usersMap, setUsersMap] = useState<Map<string, User>>(new Map());
    const { setHelp } = useHelp();
    const [dateFilter, setDateFilter] = useState<string>("all");
    const [customDate, setCustomDate] = React.useState<DateRange | undefined>(undefined);

    useEffect(() => {
        setHelp({
            title: t('help.title'),
            content: (
                <div className="space-y-4 text-sm">
                    <p>{t('help.content')}</p>
                    <ul className="list-disc space-y-2 pl-5">
                        <li><span className="font-semibold">{t('help.kpiTitle')}</span> {t('help.kpiContent')}</li>
                        <li><span className="font-semibold">{t('help.logTitle')}</span> {t('help.logContent')}</li>
                        <li><span className="font-semibold">{t('help.searchTitle')}</span> {t('help.searchContent')}</li>
                    </ul>
                </div>
            )
        })
    }, [setHelp, t]);

    useEffect(() => {
        if (!userLoading && !isAdmin) {
            router.push('/dashboard');
        }
    }, [isAdmin, userLoading, router]);

    const fetchTransactionsAndUsers = useCallback(async () => {
        if (!user) return;
        setLoading(true);

        try {
            // @ts-ignore
            const token = await user.getIdToken();
            const response = await fetch('/api/transactions/history', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error("Failed to fetch history");

            const data = await response.json();

            // Map users from response
            const fetchedUsersMap = new Map<string, User>();
            if (data.users) {
                // @ts-ignore
                data.users.forEach((u: any) => fetchedUsersMap.set(u.id, u));
            }
            setUsersMap(fetchedUsersMap);
            setTransactions(data.transactions || []);

        } catch (error) {
            console.error("Error fetching transactions:", error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (user) {
            fetchTransactionsAndUsers();
        }
    }, [user, fetchTransactionsAndUsers]);

    const enhancedStats = useMemo(() => {
        // Calculate base total volume
        const totalVolume = transactions.reduce((sum, t) => {
            if (t.status === 'funded' || t.status === 'released') {
                return sum + t.amount;
            }
            return sum;
        }, 0);

        // Calculate total commission (platform revenue)
        const totalCommission = transactions.reduce((sum, t) => {
            if (t.status === 'released') {
                return sum + (t.commission || 0) + (t.jobGiverFee || 0);
            }
            return sum;
        }, 0);

        // Calculate refunded amount
        const totalRefunded = transactions.reduce((sum, t) => {
            if (t.status === 'refunded') {
                return sum + t.amount;
            }
            return sum;
        }, 0);

        // Calculate released and funded amounts
        const totalReleased = transactions.reduce((sum, t) => {
            if (t.status === 'released') {
                return sum + t.amount;
            }
            return sum;
        }, 0);

        const totalFunded = transactions.reduce((sum, t) => {
            if (t.status === 'funded') {
                return sum + t.amount;
            }
            return sum;
        }, 0);

        // Count transactions
        const totalTransactions = transactions.length;
        const fundedTransactions = transactions.filter(t => t.status === 'funded').length;
        const releasedTransactions = transactions.filter(t => t.status === 'released').length;
        const refundedTransactions = transactions.filter(t => t.status === 'refunded').length;

        return {
            totalReleased,
            totalFunded,
            totalVolume,
            totalCommission,
            totalRefunded,
            totalTransactions,
            fundedTransactions,
            releasedTransactions,
            refundedTransactions,
        };
    }, [transactions]);


    const enrichedTransactions = useMemo(() => {
        return transactions.map(t => ({
            ...t,
            payerName: usersMap.get(t.payerId)?.name || t.payerId,
            payeeName: usersMap.get(t.payeeId)?.name || t.payeeId,
        }));
    }, [transactions, usersMap]);

    const filteredTransactions = useMemo(() => {
        return enrichedTransactions.filter(t => {
            const search = filters.search.toLowerCase();
            const matchesSearch = search === "" ||
                t.id.toLowerCase().includes(search) ||
                t.jobId.toLowerCase().includes(search) ||
                t.jobTitle.toLowerCase().includes(search) ||
                (t.payerName && t.payerName.toLowerCase().includes(search)) ||
                (t.payeeName && t.payeeName.toLowerCase().includes(search));

            const matchesStatus = filters.status === 'all' || t.status === filters.status;

            return matchesSearch && matchesStatus;
        });
    }, [enrichedTransactions, filters]);

    const handleFilterChange = (filterName: keyof typeof filters, value: string) => {
        setFilters(prev => ({ ...prev, [filterName]: value }));
    };

    const clearFilters = () => setFilters(initialFilters);
    const allStatuses = ["All", ...Array.from(new Set(transactions.map(t => t.status)))];

    const [activeTab, setActiveTab] = useState<string>('all');

    // Filter configuration for FilterBar
    const filterConfig: Filter[] = [
        {
            id: 'search',
            label: t('filters.search'),
            type: 'search',
            placeholder: t('filters.searchPlaceholder'),
            value: filters.search,
            onChange: (value) => handleFilterChange('search', value),
        },
        {
            id: 'status',
            label: t('filters.status'),
            type: 'select',
            options: allStatuses.map(s => ({
                label: s,
                value: s.toLowerCase() === 'all' ? 'all' : s
            })),
            value: filters.status,
            onChange: (value) => handleFilterChange('status', value),
        },
    ];

    // Export data
    const exportData = filteredTransactions.map(txn => ({
        [t('export.id')]: txn.id,
        [t('export.jobId')]: txn.jobId,
        [t('export.jobTitle')]: txn.jobTitle,
        [t('export.from')]: txn.payerName,
        [t('export.to')]: txn.payeeName,
        [t('export.amount')]: txn.amount,
        [t('export.status')]: txn.status,
        [t('export.created')]: format(toDate(txn.createdAt), 'yyyy-MM-dd HH:mm:ss'),
    }));

    // Tab filtered transactions
    const tabFilteredTransactions = useMemo(() => {
        switch (activeTab) {
            case 'funded':
                return filteredTransactions.filter(t => t.status === 'funded');
            case 'released':
                return filteredTransactions.filter(t => t.status === 'released');
            case 'refunded':
                return filteredTransactions.filter(t => t.status === 'refunded');
            default:
                return filteredTransactions;
        }
    }, [filteredTransactions, activeTab]);

    if (userLoading) {
        return <div className="flex h-48 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
    }

    return (
        <div className="grid gap-6 max-w-full overflow-x-hidden px-4">
            {/* Revenue Dashboard - Admin Only */}
            {isAdmin && (
                <>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                        <StatCard
                            title={t('kpi.volume')}
                            value={`₹${enhancedStats.totalVolume.toLocaleString()}`}
                            icon={TrendingUp}
                            description={t('kpi.volumeDesc')}
                        />
                        <StatCard
                            title={t('kpi.released')}
                            value={`₹${enhancedStats.totalReleased.toLocaleString()}`}
                            icon={CheckCircle2}
                            description={t('kpi.releasedDesc', { count: enhancedStats.releasedTransactions })}
                        />
                        <StatCard
                            title={t('kpi.escrow')}
                            value={`₹${enhancedStats.totalFunded.toLocaleString()}`}
                            icon={Hourglass}
                            description={t('kpi.escrowDesc', { count: enhancedStats.fundedTransactions })}
                        />
                        <StatCard
                            title={t('kpi.revenue')}
                            value={`₹${enhancedStats.totalCommission.toLocaleString()}`}
                            icon={DollarSign}
                            description={t('kpi.revenueDesc')}
                        />
                        <StatCard
                            title={t('kpi.refunded')}
                            value={`₹${enhancedStats.totalRefunded.toLocaleString()}`}
                            icon={RefreshCw}
                            description={t('kpi.refundedDesc', { count: enhancedStats.refundedTransactions })}
                        />
                    </div>
                </>
            )}

            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <CardTitle>{t('title')}</CardTitle>
                            <CardDescription>
                                {isAdmin ? t('adminDescription') : t('description')}
                                {' '}• {t('shown', { count: filteredTransactions.length })}
                            </CardDescription>
                        </div>
                        <ExportButton
                            data={exportData}
                            filename={`transactions-${new Date().toISOString().split('T')[0]}`}
                            formats={['csv', 'json']}
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    {/* Tabs */}
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
                        <TabsList>
                            <TabsTrigger value="all">{t('tabs.all')} ({filteredTransactions.length})</TabsTrigger>
                            <TabsTrigger value="funded">
                                {t('tabs.funded')} ({filteredTransactions.filter(t => t.status === 'funded').length})
                            </TabsTrigger>
                            <TabsTrigger value="released">
                                {t('tabs.released')} ({filteredTransactions.filter(t => t.status === 'released').length})
                            </TabsTrigger>
                            <TabsTrigger value="refunded">
                                {t('tabs.refunded')} ({filteredTransactions.filter(t => t.status === 'refunded').length})
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>

                    {/* Filters */}
                    <div className="mb-4">
                        <FilterBar filters={filterConfig} onReset={clearFilters} />
                    </div>

                    {/* Transactions Table (Desktop) */}
                    <div className="hidden md:block">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('table.transaction')}</TableHead>
                                    <TableHead>{t('table.job')}</TableHead>
                                    <TableHead>{t('table.parties')}</TableHead>
                                    <TableHead className="text-right">{t('table.amount')}</TableHead>
                                    <TableHead>{t('table.status')}</TableHead>
                                    <TableHead>{t('table.timestamp')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center">
                                            <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                                        </TableCell>
                                    </TableRow>
                                ) : tabFilteredTransactions.length > 0 ? (
                                    tabFilteredTransactions.map((t) => {
                                        const latestTimestamp = toDate(t.releasedAt || t.fundedAt || t.failedAt || t.createdAt);
                                        return (
                                            <TableRow key={t.id}>
                                                <TableCell className="font-mono text-xs">{t.id}</TableCell>
                                                <TableCell>
                                                    <Link href={`/dashboard/jobs/${t.jobId}`} className="font-medium hover:underline">{t.jobTitle}</Link>
                                                    <p className="text-xs text-muted-foreground font-mono">{t.jobId}</p>
                                                </TableCell>
                                                <TableCell className="text-sm">
                                                    <div className="flex items-center gap-2">
                                                        <Link href={`/dashboard/users/${t.payerId}`} className="font-medium hover:underline">{t.payerName}</Link>
                                                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                                        <Link href={`/dashboard/users/${t.payeeId}`} className="font-medium hover:underline">{t.payeeName}</Link>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right font-semibold">₹{t.amount.toLocaleString()}</TableCell>
                                                <TableCell>
                                                    <Badge variant={getStatusVariant(t.status)}>{t.status}</Badge>
                                                </TableCell>
                                                <TableCell title={format(latestTimestamp, "PPpp")}>
                                                    {formatDistanceToNow(latestTimestamp, { addSuffix: true })}
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24">
                                            <AdminEmptyState
                                                icon={Inbox}
                                                title={t('empty.title')}
                                                description={t('empty.description')}
                                                action={{
                                                    label: t('filters.reset'),
                                                    onClick: clearFilters,
                                                }}
                                            />
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Mobile: Cards List */}
                    <div className="md:hidden space-y-4">
                        {loading ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : tabFilteredTransactions.length > 0 ? (
                            tabFilteredTransactions.map(t => (
                                <MobileTransactionCard key={t.id} transaction={t} />
                            ))
                        ) : (
                            <AdminEmptyState
                                icon={Inbox}
                                title={t('empty.title')}
                                description={t('empty.description')}
                                action={{
                                    label: t('filters.reset'),
                                    onClick: clearFilters,
                                }}
                            />
                        )}
                    </div>
                </CardContent>
            </Card>
        </div >
    );
}
