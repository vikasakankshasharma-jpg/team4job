
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
import { Loader2, IndianRupee, ArrowRight, X, Wallet, CheckCircle2, ShieldEllipsis } from "lucide-react";
import { useUser, useFirebase } from "@/hooks/use-user";
import { useRouter } from "next/navigation";
import { Transaction, User } from "@/lib/types";
import { toDate } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";
import { collection, getDocs, query, where } from "firebase/firestore";
import Link from "next/link";

const getStatusVariant = (status: Transaction['status']) => {
  switch (status) {
    case 'Paid': return 'success';
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
  const { isAdmin, loading: userLoading } = useUser();
  const { db } = useFirebase();
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(initialFilters);
  const [usersMap, setUsersMap] = useState<Map<string, User>>(new Map());

  useEffect(() => {
    if (!userLoading && !isAdmin) {
      router.push('/dashboard');
    }
  }, [isAdmin, userLoading, router]);

  const fetchTransactionsAndUsers = useCallback(async () => {
    if (!db || !isAdmin) return;
    setLoading(true);
    
    // Fetch all transactions
    const transactionsQuery = query(collection(db, "transactions"));
    const transactionsSnapshot = await getDocs(transactionsQuery);
    const transactionsList = transactionsSnapshot.docs.map(doc => doc.data() as Transaction);

    // Collect all unique user IDs from transactions
    const userIds = new Set<string>();
    transactionsList.forEach(t => {
      userIds.add(t.payerId);
      userIds.add(t.payeeId);
    });

    // Fetch user data
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
  }, [db, isAdmin]);

  useEffect(() => {
    if (isAdmin) {
      fetchTransactionsAndUsers();
    }
  }, [isAdmin, fetchTransactionsAndUsers]);

  const enrichedTransactions = useMemo(() => {
    return transactions.map(t => ({
      ...t,
      payerName: usersMap.get(t.payerId)?.name || t.payerName || t.payerId,
      payeeName: usersMap.get(t.payeeId)?.name || t.payeeName || t.payeeId,
    }));
  }, [transactions, usersMap]);

  const filteredTransactions = useMemo(() => {
    return enrichedTransactions.filter(t => {
      const search = filters.search.toLowerCase();
      const matchesSearch = search === "" ||
        t.id.toLowerCase().includes(search) ||
        t.jobId.toLowerCase().includes(search) ||
        t.jobTitle.toLowerCase().includes(search) ||
        t.payerName.toLowerCase().includes(search) ||
        t.payeeName.toLowerCase().includes(search);
      
      const matchesStatus = filters.status === 'all' || t.status === filters.status;

      return matchesSearch && matchesStatus;
    });
  }, [enrichedTransactions, filters]);
  
  const stats = useMemo(() => {
    return transactions.reduce((acc, t) => {
        if(t.status === 'Paid'){
            acc.totalPayouts += t.amount;
        }
        return acc;
    }, { totalPayouts: 0 });
  }, [transactions]);

  const handleFilterChange = (filterName: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };

  const clearFilters = () => setFilters(initialFilters);
  const activeFiltersCount = Object.values(filters).filter(v => v && v !== 'all').length;
  const allStatuses = ["All", ...Array.from(new Set(transactions.map(t => t.status)))];

  if (userLoading || !isAdmin) {
    return <div className="flex h-48 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="grid gap-6">
        <div className="grid gap-4 md:grid-cols-2">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Payouts</CardTitle>
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">₹{stats.totalPayouts.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">Total funds paid to installers</p>
                </CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Platform Revenue (Simulated)</CardTitle>
                    <IndianRupee className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">₹{(stats.totalPayouts * 0.12).toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">Based on a 12% commission from payouts</p>
                </CardContent>
            </Card>
        </div>
        <Card>
        <CardHeader>
            <CardTitle>Transactions</CardTitle>
            <CardDescription>A log of all financial transactions on the platform.</CardDescription>
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
                    const latestTimestamp = toDate(t.paidAt || t.createdAt);
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

    