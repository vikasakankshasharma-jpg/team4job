
"use client";

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

const getStatusVariant = (status: Transaction['status']) => {
    switch (status) {
        case 'Released': return 'success';
        case 'Funded': return 'info';
        case 'Refunded': return 'secondary';
        case 'Failed': return 'destructive';
        default: return 'outline';
    }
};

const initialFilters = {
    search: "",
    status: "all",
};

export default function TransactionsClient() {
    const { user, isAdmin, loading: userLoading } = useUser();
    const { db } = useFirebase();
    const router = useRouter();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState(initialFilters);
    const [usersMap, setUsersMap] = useState<Map<string, User>>(new Map());
    const { setHelp } = useHelp();
    const [dateFilter, setDateFilter] = useState<string>("all");
    const [customDate, setCustomDate] = React.useState<DateRange | undefined>(undefined);

    useEffect(() => {
        setHelp({
            title: "Transactions",
            content: (
                <div className="space-y-4 text-sm">
                    <p>This page provides a detailed audit trail of every financial transaction that occurs on the platform. It&apos;s an essential tool for accounting and tracking revenue.</p>
                    <ul className="list-disc space-y-2 pl-5">
                        <li><span className="font-semibold">KPI Cards & Date Filters:</span> At the top, you&apos;ll find key performance indicators. Use the date filter to see the total value of funds released to installers over specific periods. &quot;Currently Held&quot; always shows the real-time balance.</li>
                        <li><span className="font-semibold">Transaction Log:</span> The main table shows a chronological list of all transactions, including payments from Job Givers, payouts to Installers, and any refunds.</li>
                        <li><span className="font-semibold">Search & Filter:</span> Use the controls to quickly find specific transactions. You can search by Transaction ID, Job ID, or user name, and filter by the transaction status.</li>
                    </ul>
                </div>
            )
        })
    }, [setHelp]);

    useEffect(() => {
        if (!userLoading && !isAdmin) {
            router.push('/dashboard');
        }
    }, [isAdmin, userLoading, router]);

    const fetchTransactionsAndUsers = useCallback(async () => {
        if (!db || !user) return;
        setLoading(true);

        try {
            let transactionsQuery;
            if (isAdmin) {
                transactionsQuery = query(collection(db, "transactions"));
            } else {
                transactionsQuery = query(collection(db, "transactions"), or(
                    where("payerId", "==", user.id),
                    where("payeeId", "==", user.id)
                ));
            }

            const transactionsSnapshot = await getDocs(transactionsQuery);
            const transactionsList = transactionsSnapshot.docs.map(doc => doc.data() as Transaction);

            const userIds = new Set<string>();
            transactionsList.forEach(t => {
                userIds.add(t.payerId);
                if (t.payeeId) userIds.add(t.payeeId);
            });

            if (userIds.size > 0) {
                // Filter out any undefined/null values to prevent "Invalid query" errors
                const userIdsArray = Array.from(userIds).filter(id => id);

                if (userIdsArray.length > 0) {
                    // Firestore 'in' query supports max 10 values. Chunk queries into batches of 10.
                    const fetchedUsersMap = new Map<string, User>();

                    for (let i = 0; i < userIdsArray.length; i += 10) {
                        const chunk = userIdsArray.slice(i, i + 10);
                        const usersQuery = query(collection(db, 'users'), where('__name__', 'in', chunk));
                        const usersSnapshot = await getDocs(usersQuery);

                        usersSnapshot.forEach(doc => {
                            fetchedUsersMap.set(doc.id, { id: doc.id, ...doc.data() } as User);
                        });
                    }

                    setUsersMap(fetchedUsersMap);
                }
            }

            setTransactions(transactionsList.sort((a, b) => toDate(b.createdAt).getTime() - toDate(a.createdAt).getTime()));
        } catch (error) {
            console.error("Error fetching transactions:", error);
        } finally {
            setLoading(false);
        }
    }, [db, user, isAdmin]);

    useEffect(() => {
        if (user) {
            fetchTransactionsAndUsers();
        }
    }, [user, fetchTransactionsAndUsers]);

    const enhancedStats = useMemo(() => {
        // Calculate base total volume
        const totalVolume = transactions.reduce((sum, t) => {
            if (t.status === 'Funded' || t.status === 'Released') {
                return sum + t.amount;
            }
            return sum;
        }, 0);

        // Calculate total commission (platform revenue)
        const totalCommission = transactions.reduce((sum, t) => {
            if (t.status === 'Released') {
                return sum + (t.commission || 0) + (t.jobGiverFee || 0);
            }
            return sum;
        }, 0);

        // Calculate refunded amount
        const totalRefunded = transactions.reduce((sum, t) => {
            if (t.status === 'Refunded') {
                return sum + t.amount;
            }
            return sum;
        }, 0);

        // Calculate released and funded amounts
        const totalReleased = transactions.reduce((sum, t) => {
            if (t.status === 'Released') {
                return sum + t.amount;
            }
            return sum;
        }, 0);

        const totalFunded = transactions.reduce((sum, t) => {
            if (t.status === 'Funded') {
                return sum + t.amount;
            }
            return sum;
        }, 0);

        // Count transactions
        const totalTransactions = transactions.length;
        const fundedTransactions = transactions.filter(t => t.status === 'Funded').length;
        const releasedTransactions = transactions.filter(t => t.status === 'Released').length;
        const refundedTransactions = transactions.filter(t => t.status === 'Refunded').length;

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
            label: 'Search',
            type: 'search',
            placeholder: 'Search by ID, Job, or User...',
            value: filters.search,
            onChange: (value) => handleFilterChange('search', value),
        },
        {
            id: 'status',
            label: 'Status',
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
    const exportData = filteredTransactions.map(t => ({
        'Transaction ID': t.id,
        'Job ID': t.jobId,
        'Job Title': t.jobTitle,
        'From': t.payerName,
        'To': t.payeeName,
        'Amount': t.amount,
        'Status': t.status,
        'Created': format(toDate(t.createdAt), 'yyyy-MM-dd HH:mm:ss'),
    }));

    // Tab filtered transactions
    const tabFilteredTransactions = useMemo(() => {
        switch (activeTab) {
            case 'funded':
                return filteredTransactions.filter(t => t.status === 'Funded');
            case 'released':
                return filteredTransactions.filter(t => t.status === 'Released');
            case 'refunded':
                return filteredTransactions.filter(t => t.status === 'Refunded');
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
                            title="Total Volume"
                            value={`₹${enhancedStats.totalVolume.toLocaleString()}`}
                            icon={TrendingUp}
                            description="All transactions"
                        />
                        <StatCard
                            title="Released"
                            value={`₹${enhancedStats.totalReleased.toLocaleString()}`}
                            icon={CheckCircle2}
                            description={`${enhancedStats.releasedTransactions} payouts`}
                        />
                        <StatCard
                            title="Held in Escrow"
                            value={`₹${enhancedStats.totalFunded.toLocaleString()}`}
                            icon={Hourglass}
                            description={`${enhancedStats.fundedTransactions} pending`}
                        />
                        <StatCard
                            title="Platform Revenue"
                            value={`₹${enhancedStats.totalCommission.toLocaleString()}`}
                            icon={DollarSign}
                            description="Commissions earned"
                        />
                        <StatCard
                            title="Refunded"
                            value={`₹${enhancedStats.totalRefunded.toLocaleString()}`}
                            icon={RefreshCw}
                            description={`${enhancedStats.refundedTransactions} refunds`}
                        />
                    </div>
                </>
            )}

            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <CardTitle>Transactions</CardTitle>
                            <CardDescription>
                                {isAdmin ? 'All platform transactions' : 'Your transaction history'}
                                {' '}• {filteredTransactions.length} transactions shown
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
                            <TabsTrigger value="all">All ({filteredTransactions.length})</TabsTrigger>
                            <TabsTrigger value="funded">
                                Funded ({filteredTransactions.filter(t => t.status === 'Funded').length})
                            </TabsTrigger>
                            <TabsTrigger value="released">
                                Released ({filteredTransactions.filter(t => t.status === 'Released').length})
                            </TabsTrigger>
                            <TabsTrigger value="refunded">
                                Refunded ({filteredTransactions.filter(t => t.status === 'Refunded').length})
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>

                    {/* Filters */}
                    <div className="mb-4">
                        <FilterBar filters={filterConfig} onReset={clearFilters} />
                    </div>

                    {/* Transactions Table */}
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Transaction</TableHead>
                                <TableHead>Job</TableHead>
                                <TableHead>Parties</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Timestamp</TableHead>
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
                                            title="No transactions found"
                                            description="No transactions match your current filters"
                                            action={{
                                                label: 'Reset Filters',
                                                onClick: clearFilters,
                                            }}
                                        />
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
