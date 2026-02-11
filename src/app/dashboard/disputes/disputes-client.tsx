
"use client";

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    CardFooter,
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
import { useRouter } from "next/navigation";
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useUser, useFirebase } from "@/hooks/use-user";
import { Dispute, User } from "@/lib/types";
import { toDate } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { PlusCircle, Loader2, AlertOctagon, CheckCircle2, MessageSquare, X, List, Grid } from "lucide-react";
import Link from "next/link";
import { collection, query, where, getDocs, and } from "firebase/firestore";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { DocumentReference } from "firebase/firestore";
import { useHelp } from "@/hooks/use-help";
import { useTranslations } from "next-intl";

const getStatusVariant = (status: Dispute['status']) => {
    switch (status) {
        case 'Open':
            return 'destructive';
        case 'Under Review':
            return 'warning';
        case 'Resolved':
            return 'success';
        default:
            return 'default';
    }
};

const getRefId = (ref: any): string | null => {
    if (!ref) return null;
    if (typeof ref === 'string') return ref;
    return ref.id || null;
}

function DisputeCard({ dispute, involvedUsers }: { dispute: Dispute, involvedUsers: Record<string, User> }) {
    const router = useRouter();
    const t = useTranslations('disputes');
    const lastMessage = dispute.messages[dispute.messages.length - 1];
    const lastUpdate = lastMessage ? toDate(lastMessage.timestamp) : toDate(dispute.createdAt);

    // Get translated status
    const getStatusText = (status: Dispute['status']) => {
        switch (status) {
            case 'Open': return t('statusOpen');
            case 'Under Review': return t('statusUnderReview');
            case 'Resolved': return t('statusResolved');
            default: return status;
        }
    };

    return (
        <Card onClick={() => router.push(`/dashboard/disputes/${dispute.id}`)} className="cursor-pointer">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <CardTitle className="text-base leading-tight pr-4">{dispute.title}</CardTitle>
                    <Badge variant={getStatusVariant(dispute.status)}>{getStatusText(dispute.status)}</Badge>
                </div>
                <CardDescription className="font-mono text-xs pt-1">#{dispute.id.slice(-6).toUpperCase()}</CardDescription>
            </CardHeader>
            <CardContent className="text-sm space-y-3">
                <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('requester')}</span>
                    <span className="font-medium">{involvedUsers[dispute.requesterId]?.name || t('unknownUser')}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('jobId')}</span>
                    <span className="font-mono text-xs">{dispute.jobId || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('category')}</span>
                    <span className="font-medium">{dispute.category}</span>
                </div>
            </CardContent>
            <CardFooter className="text-xs text-muted-foreground">
                {t('lastUpdatedAgo', { time: formatDistanceToNow(lastUpdate, { addSuffix: true }) })}
            </CardFooter>
        </Card>
    );
}

export default function DisputesClient() {
    const router = useRouter();
    const { user, isAdmin, loading: userLoading } = useUser();
    const t = useTranslations('disputes');
    const tCommon = useTranslations('common');
    // const { db } = useFirebase(); // Unused
    const [disputes, setDisputes] = useState<Dispute[]>([]);
    const [involvedUsers, setInvolvedUsers] = useState<Record<string, User>>({});
    const [loading, setLoading] = useState(true);
    const { setHelp } = useHelp();
    const [view, setView] = useState<'list' | 'grid'>('list');

    const [filters, setFilters] = useState({
        status: 'all',
        category: 'all',
        search: '',
    });

    // Get translated status
    const getStatusText = (status: Dispute['status']) => {
        switch (status) {
            case 'Open': return t('statusOpen');
            case 'Under Review': return t('statusUnderReview');
            case 'Resolved': return t('statusResolved');
            default: return status;
        }
    };

    React.useEffect(() => {
        setHelp({
            title: t('guide.title'),
            content: (
                <div className="space-y-4 text-sm">
                    <p>{t('guide.content')}</p>
                    <ul className="list-disc space-y-2 pl-5">
                        {isAdmin && (
                            <li><span className="font-semibold">{t('guide.adminViewLabel')}</span> {t('guide.adminViewDesc')}</li>
                        )}
                        <li><span className="font-semibold">{t('guide.userViewLabel')}</span> {t('guide.userViewDesc')}</li>
                        <li><span className="font-semibold">{t('guide.ticketStatusLabel')}</span>
                            <ul className="list-disc space-y-1 pl-5 mt-1">
                                <li><span className="font-semibold text-red-500">{t('guide.ticketStatusOpen')}</span> {t('guide.ticketStatusOpenDesc')}</li>
                                <li><span className="font-semibold text-yellow-500">{t('guide.ticketStatusUnderReview')}</span> {t('guide.ticketStatusUnderReviewDesc')}</li>
                                <li><span className="font-semibold text-green-500">{t('guide.ticketStatusResolved')}</span> {t('guide.ticketStatusResolvedDesc')}</li>
                            </ul>
                        </li>
                        <li><span className="font-semibold">{t('guide.viewDetailsLabel')}</span> {t('guide.viewDetailsDesc')}</li>
                    </ul>
                </div>
            )
        })
    }, [setHelp, isAdmin, t]);

    const fetchDisputes = useCallback(async () => {
        if (!user) return;
        setLoading(true);

        try {
            // @ts-ignore
            const token = await user.getIdToken();
            const response = await fetch('/api/disputes/my-disputes', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setDisputes(data.disputes || []);
                setInvolvedUsers(data.involvedUsers || {});
            }
        } catch (error) {
            console.error("Error fetching disputes:", error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (!userLoading && user) {
            fetchDisputes();
        }
    }, [userLoading, user, fetchDisputes]);

    const handleFilterChange = (filterName: keyof typeof filters, value: string) => {
        setFilters(prev => ({ ...prev, [filterName]: value }));
    };

    const clearFilters = () => setFilters({ status: 'all', category: 'all', search: '' });

    const filteredDisputes = useMemo(() => {
        return disputes.filter(d => {
            if (filters.status !== 'all' && d.status !== filters.status) return false;
            if (filters.category !== 'all' && d.category !== filters.category) return false;
            if (filters.search) {
                const searchTerm = filters.search.toLowerCase();
                const requesterName = involvedUsers[d.requesterId]?.name.toLowerCase() || '';
                return d.id.toLowerCase().includes(searchTerm) ||
                    d.jobId?.toLowerCase().includes(searchTerm) ||
                    requesterName.includes(searchTerm);
            }
            return true;
        });
    }, [disputes, filters, involvedUsers]);

    const stats = useMemo(() => {
        return disputes.reduce((acc, d) => {
            if (d.status === 'Open') acc.open++;
            if (d.status === 'Under Review') acc.underReview++;
            if (d.status === 'Resolved') acc.resolved++;
            return acc;
        }, { open: 0, underReview: 0, resolved: 0 });
    }, [disputes]);

    if (userLoading) {
        return <div className="flex items-center justify-center h-full"><Loader2 className="h-6 w-6 animate-spin" /></div>;
    }

    const allCategories = ["All", ...Array.from(new Set(disputes.map(d => d.category)))];
    const activeFiltersCount = Object.values(filters).filter(v => v && v !== 'all').length;

    return (
        <div className="grid gap-6 max-w-full overflow-x-hidden px-4">
            {isAdmin && (
                <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{t('openDisputesCard')}</CardTitle>
                            <AlertOctagon className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.open}</div>
                            <p className="text-xs text-muted-foreground">{t('openDisputesDesc')}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{t('underReviewCard')}</CardTitle>
                            <MessageSquare className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.underReview}</div>
                            <p className="text-xs text-muted-foreground">{t('underReviewDesc')}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{t('resolvedDisputesCard')}</CardTitle>
                            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.resolved}</div>
                            <p className="text-xs text-muted-foreground">{t('resolvedDisputesDesc')}</p>
                        </CardContent>
                    </Card>
                </div>
            )}
            <Card>
                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <CardTitle>{t('center')}</CardTitle>
                        <CardDescription>
                            {isAdmin ? t('centerDescAdmin') : t('centerDescUser')}
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        {!isAdmin && (
                            <Button asChild className="w-full sm:w-auto">
                                <Link href="/dashboard/disputes/new">
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    {t('createNewTicket')}
                                </Link>
                            </Button>
                        )}
                        {isAdmin && (
                            <div className="flex items-center gap-1 rounded-md bg-secondary p-1">
                                <Button variant={view === 'list' ? 'secondary' : 'ghost'} size="icon" className="h-7 w-7" onClick={() => setView('list')}>
                                    <List className="h-4 w-4" />
                                </Button>
                                <Button variant={view === 'grid' ? 'secondary' : 'ghost'} size="icon" className="h-7 w-7" onClick={() => setView('grid')}>
                                    <Grid className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    {isAdmin && (
                        <div className="mb-4 flex flex-col sm:flex-row items-center gap-2">
                            <Input
                                placeholder={t('searchPlaceholder')}
                                className="flex-1"
                                value={filters.search}
                                onChange={(e) => handleFilterChange('search', e.target.value)}
                            />
                            <Select value={filters.status} onValueChange={(v) => handleFilterChange('status', v)}>
                                <SelectTrigger className="w-full sm:w-[180px]">
                                    <SelectValue placeholder={t('filterByStatus')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t('allStatuses')}</SelectItem>
                                    <SelectItem value="Open">{t('statusOpen')}</SelectItem>
                                    <SelectItem value="Under Review">{t('statusUnderReview')}</SelectItem>
                                    <SelectItem value="Resolved">{t('statusResolved')}</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={filters.category} onValueChange={(v) => handleFilterChange('category', v)}>
                                <SelectTrigger className="w-full sm:w-[180px]">
                                    <SelectValue placeholder={t('filterByCategory')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {allCategories.map(cat => <SelectItem key={cat} value={cat.toLowerCase() === 'all' ? 'all' : cat}>{cat}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            {activeFiltersCount > 0 && (
                                <Button variant="ghost" onClick={clearFilters}>
                                    <X className="h-4 w-4 mr-1" />
                                    {t('clear', { count: activeFiltersCount })}
                                </Button>
                            )}
                        </div>
                    )}

                    {view === 'list' ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('ticketNumber')}</TableHead>
                                    <TableHead>{t('subject')}</TableHead>
                                    {isAdmin && <TableHead>{t('requester')}</TableHead>}
                                    <TableHead>{tCommon('status')}</TableHead>
                                    <TableHead>Last Updated</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={isAdmin ? 5 : 4} className="h-24 text-center">
                                            <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                                        </TableCell>
                                    </TableRow>
                                ) : filteredDisputes.length > 0 ? (
                                    filteredDisputes.map((dispute) => {
                                        const lastMessage = dispute.messages[dispute.messages.length - 1];
                                        const lastUpdate = lastMessage ? toDate(lastMessage.timestamp) : toDate(dispute.createdAt);
                                        return (
                                            <TableRow key={dispute.id} onClick={() => router.push(`/dashboard/disputes/${dispute.id}`)} className="cursor-pointer">
                                                <TableCell className="font-mono">#{dispute.id.slice(-6).toUpperCase()}</TableCell>
                                                <TableCell className="font-medium max-w-xs truncate">{dispute.title}</TableCell>
                                                {isAdmin && (
                                                    <TableCell>{involvedUsers[dispute.requesterId]?.name || t('unknownUser')}</TableCell>
                                                )}
                                                <TableCell>
                                                    <Badge variant={getStatusVariant(dispute.status)}>
                                                        {getStatusText(dispute.status)}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell title={format(lastUpdate, "PPP p")}>{formatDistanceToNow(lastUpdate, { addSuffix: true })}</TableCell>
                                            </TableRow>
                                        )
                                    })
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={isAdmin ? 5 : 4} className="h-24 text-center">
                                            {t('noDisputesFound')}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    ) : (
                        <div>
                            {loading ? (
                                <div className="text-center py-10 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin" /></div>
                            ) : filteredDisputes.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {filteredDisputes.map((dispute) => (
                                        <DisputeCard key={dispute.id} dispute={dispute} involvedUsers={involvedUsers} />
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-10 text-muted-foreground">{t('noDisputesFound')}</div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
