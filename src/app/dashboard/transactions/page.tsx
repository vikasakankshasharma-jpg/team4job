
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
import { Loader2, IndianRupee, ArrowRight, X, Wallet, CheckCircle2, ShieldEllipsis, Hourglass } from "lucide-react";
import { useUser, useFirebase } from "@/hooks/use-user";
import { useRouter } from "next/navigation";
import { Transaction, User } from "@/lib/types";
import { toDate } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";
import { collection, getDocs, query, where, or } from "firebase/firestore";
import Link from "next/link";
import { useHelp } from "@/hooks/use-help";

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

export default function TransactionsPage() {
  const { user, isAdmin, loading: userLoading } = useUser();
  const { db } = useFirebase();
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(initialFilters);
  const [usersMap, setUsersMap] = useState<Map<string, User>>(new Map());
  const { setHelp } = useHelp();

  useEffect(() => {
    setHelp({
      title: "Transactions",
      content: (
        <div className="space-y-4 text-sm">
          <p>This page provides a detailed audit trail of every financial transaction that occurs on the platform. It's an essential tool for accounting and tracking revenue.</p>
          <ul className="list-disc space-y-2 pl-5">
            <li><span className="font-semibold">KPI Cards:</span> At the top, you'll find key performance indicators showing the total value of funds released to installers and the amount currently held in the system for active jobs.</li>
            <li><span className="font-semibold">Transaction Log:</span> The main table shows a chronological list of all transactions, including payments from Job Givers, payouts to Installers, and any refunds.</li>
            <li><span className="font-semibold">Search & Filter:</span> Use the controls to quickly find specific transactions. You can search by Transaction ID, Job ID, or user name, and filter by the transaction status.</li>
            <li><span className="font-semibold">Status Tracking:</span>
              <ul className="list-disc space-y-1 pl-5 mt-1">
                <li><span className="font-semibold text-blue-500">Funded:</span> Job Giver has paid; funds are held.</li>
                <li><span className="font-semibold text-green-500">Released:</span> Payout successfully sent to the installer.</li>
                <li><span className="font-semibold text-gray-500">Refunded:</span> Funds returned to the Job Giver.</li>
                <li><span className="font-semibold text-red-500">Failed:</span> The transaction did not complete.</li>
              </ul>
            </li>
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
      const usersQuery = query(collection(db, 'users'), where('__name__', 'in', Array.from(userIds)));
      const usersSnapshot = await getDocs(usersQuery);
      const fetchedUsersMap = new Map<string, User>();
      usersSnapshot.forEach(doc => {
        fetchedUsersMap.set(doc.id, { id: doc.id, ...doc.data() } as User);
      });
      setUsersMap(fetchedUsersMap);
    }
    
    setTransactions(transactionsList.sort((a,b) => toDate(b.createdAt).getTime() - toDate(a.createdAt).getTime()));
    setLoading(false);
  }, [db, user, isAdmin]);

  useEffect(() => {
    if (user) {
      fetchTransactionsAndUsers();
    }
  }, [user, fetchTransactionsAndUsers]);

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
  
  const stats = useMemo(() => {
    return transactions.reduce((acc, t) => {
        if(t.status === 'Released'){
            acc.totalReleased += t.amount;
        }
        if(t.status === 'Funded'){
            acc.totalFunded += t.amount;
        }
        return acc;
    }, { totalReleased: 0, totalFunded: 0 });
  }, [transactions]);

  const handleFilterChange = (filterName: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };

  const clearFilters = () => setFilters(initialFilters);
  const activeFiltersCount = Object.values(filters).filter(v => v && v !== 'all').length;
  const allStatuses = ["All", ...Array.from(new Set(transactions.map(t => t.status)))];

  if (userLoading) {
    return <div className="flex h-48 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="grid gap-6">
        {isAdmin && (
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Value Released</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₹{stats.totalReleased.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">Total funds paid out to installers</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Funds Currently Held</CardTitle>
                        <Hourglass className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₹{stats.totalFunded.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">Funds from job givers awaiting job completion</p>
                    </CardContent>
                </Card>
            </div>
        )}
        <Card>
        <CardHeader>
            <CardTitle>Transactions</CardTitle>
            <CardDescription>A log of all your financial transactions on the platform.</CardDescription>
        </CardHeader>
        <CardContent>
             <div className="mb-4 flex flex-col sm:flex-row items-center gap-2">
                <Input 
                    placeholder="Search by ID, Job, User..." 
                    className="flex-1"
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                />
                 <Select value={filters.status} onValueChange={(v) => handleFilterChange('status', v)}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                        <SelectValue placeholder="Filter by Status" />
                    </SelectTrigger>
                    <SelectContent>
                        {allStatuses.map(s => <SelectItem key={s} value={s.toLowerCase() === 'all' ? 'all' : s}>{s}</SelectItem>)}
                    </SelectContent>
                </Select>
                {activeFiltersCount > 0 && (
                    <Button variant="ghost" onClick={clearFilters}>
                        <X className="h-4 w-4 mr-1" />
                        Clear ({activeFiltersCount})
                    </Button>
                )}
            </div>
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
                ) : filteredTransactions.length > 0 ? (
                filteredTransactions.map((t) => {
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
                                    <ArrowRight className="h-4 w-4 text-muted-foreground"/>
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
                    <TableCell colSpan={6} className="h-24 text-center">
                    No transactions found.
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
