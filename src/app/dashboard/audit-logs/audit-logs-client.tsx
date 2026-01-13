"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useUser, useFirebase } from '@/hooks/use-user';
import { collection, query, orderBy, limit, onSnapshot, Timestamp } from 'firebase/firestore';
import { formatDistanceToNow, format } from 'date-fns';
import { Loader2, Shield, User, Briefcase, AlertTriangle, Settings as SettingsIcon, Users, FileText, Activity, Calendar, Inbox } from 'lucide-react';
import { StatCard, FilterBar, ExportButton, AdminEmptyState } from "@/components/admin";
import type { Filter } from "@/components/admin";
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface AdminActionLog {
    id: string;
    adminId: string;
    adminName: string;
    adminEmail: string;
    actionType: string;
    targetType: string;
    targetId?: string;
    targetName?: string;
    details?: Record<string, any>;
    timestamp: Timestamp;
    ipAddress?: string;
}

const actionTypeColors: Record<string, string> = {
    USER_SUSPENDED: 'bg-orange-600',
    USER_ACTIVATED: 'bg-green-600',
    USER_DELETED: 'bg-red-600',
    USER_VERIFIED: 'bg-blue-600',
    JOB_DELETED: 'bg-red-500',
    JOB_FLAGGED: 'bg-yellow-600',
    DISPUTE_RESOLVED: 'bg-purple-600',
    REFUND_PROCESSED: 'bg-pink-600',
    SETTINGS_CHANGED: 'bg-gray-600',
    TEAM_MEMBER_ADDED: 'bg-teal-600',
    TEAM_MEMBER_REMOVED: 'bg-orange-500',
    SUBSCRIPTION_GRANTED: 'bg-indigo-600',
    COUPON_CREATED: 'bg-cyan-600',
    BLACKLIST_UPDATED: 'bg-red-700',
};

const targetIcons = {
    user: User,
    job: Briefcase,
    dispute: AlertTriangle,
    settings: SettingsIcon,
    team: Users,
    transaction: FileText,
    coupon: FileText,
    blacklist: Shield,
};

function getActionLabel(actionType: string): string {
    return actionType.split('_').map(word =>
        word.charAt(0) + word.slice(1).toLowerCase()
    ).join(' ');
}

export default function AuditLogsClient() {
    const { user, isAdmin, loading: userLoading } = useUser();
    const { db } = useFirebase();
    const router = useRouter();
    const [logs, setLogs] = useState<AdminActionLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [actionFilter, setActionFilter] = useState('all');

    // Authorization Guard
    useEffect(() => {
        if (!userLoading && !isAdmin) {
            router.push('/dashboard');
        }
    }, [userLoading, isAdmin, router]);

    // Fetch Audit Logs
    useEffect(() => {
        if (!db || !isAdmin) return;

        const logsRef = collection(db, 'admin_action_logs');
        const q = query(logsRef, orderBy('timestamp', 'desc'), limit(100));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const logData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as AdminActionLog));
            setLogs(logData);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [db, isAdmin]);

    // Filter logs
    const filteredLogs = React.useMemo(() => {
        return logs.filter(log => {
            const matchesSearch = searchQuery === '' ||
                log.adminName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                log.adminEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
                log.actionType.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (log.targetName && log.targetName.toLowerCase().includes(searchQuery.toLowerCase()));

            const matchesAction = actionFilter === 'all' || log.actionType === actionFilter;

            return matchesSearch && matchesAction;
        });
    }, [logs, searchQuery, actionFilter]);

    // Stats
    const stats = React.useMemo(() => {
        const totalActions = logs.length;
        const todayActions = logs.filter(log => {
            const logDate = log.timestamp.toDate();
            const today = new Date();
            return logDate.toDateString() === today.toDateString();
        }).length;
        const weekActions = logs.filter(log => {
            const logDate = log.timestamp.toDate();
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            return logDate >= weekAgo;
        }).length;

        return { totalActions, todayActions, weekActions };
    }, [logs]);

    // Export data
    const exportData = filteredLogs.map(log => ({
        'Timestamp': format(log.timestamp.toDate(), 'yyyy-MM-dd HH:mm:ss'),
        'Admin': log.adminName,
        'Email': log.adminEmail,
        'Action': getActionLabel(log.actionType),
        'Target Type': log.targetType,
        'Target Name': log.targetName || '',
        'Target ID': log.targetId || '',
    }));

    // Unique action types for filter
    const actionTypes = ['all', ...Array.from(new Set(logs.map(l => l.actionType)))];

    // Filter configuration
    const filterConfig: Filter[] = [
        {
            id: 'search',
            label: 'Search',
            type: 'search',
            placeholder: 'Search by admin, action, or target...',
            value: searchQuery,
            onChange: setSearchQuery,
        },
        {
            id: 'actionType',
            label: 'Action Type',
            type: 'select',
            options: actionTypes.map(a => ({
                label: a === 'all' ? 'All Actions' : getActionLabel(a),
                value: a
            })),
            value: actionFilter,
            onChange: setActionFilter,
        },
    ];

    if (userLoading || !isAdmin) {
        return (
            <div className="flex h-screen items-center justify-center bg-muted/20">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    const clearFilters = () => {
        setSearchQuery('');
        setActionFilter('all');
    };

    return (
        <div className="container py-8 space-y-6 max-w-full overflow-x-hidden px-4">
            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <StatCard
                    title="Total Actions"
                    value={stats.totalActions}
                    icon={Activity}
                    description="Last 100 actions"
                />
                <StatCard
                    title="Today"
                    value={stats.todayActions}
                    icon={Calendar}
                    description="Actions performed today"
                />
                <StatCard
                    title="This Week"
                    value={stats.weekActions}
                    icon={Calendar}
                    description="Last 7 days"
                />
            </div>

            {/* Audit Log Table */}
            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Shield className="h-5 w-5" />
                                Admin Audit Log
                            </CardTitle>
                            <CardDescription>
                                {filteredLogs.length} actions shown • Chronological record of all admin actions
                            </CardDescription>
                        </div>
                        <ExportButton
                            data={exportData}
                            filename={`audit-logs-${new Date().toISOString().split('T')[0]}`}
                            formats={['csv', 'json']}
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    {/* Filters */}
                    <div className="mb-4">
                        <FilterBar filters={filterConfig} onReset={clearFilters} />
                    </div>

                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Timestamp</TableHead>
                                    <TableHead>Admin</TableHead>
                                    <TableHead>Action</TableHead>
                                    <TableHead>Target</TableHead>
                                    <TableHead>Details</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">
                                            <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                                        </TableCell>
                                    </TableRow>
                                ) : filteredLogs.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24">
                                            <AdminEmptyState
                                                icon={Inbox}
                                                title="No audit logs found"
                                                description="No admin actions match your current filters"
                                                action={{
                                                    label: 'Reset Filters',
                                                    onClick: clearFilters,
                                                }}
                                            />
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredLogs.map((log) => {
                                        const TargetIcon = targetIcons[log.targetType as keyof typeof targetIcons] || Shield;

                                        return (
                                            <TableRow key={log.id}>
                                                <TableCell className="whitespace-nowrap">
                                                    <div className="text-sm font-medium">
                                                        {format(log.timestamp.toDate(), 'PP')}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {format(log.timestamp.toDate(), 'pp')}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {formatDistanceToNow(log.timestamp.toDate(), { addSuffix: true })}
                                                    </div>
                                                </TableCell>

                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-medium">{log.adminName}</span>
                                                        <span className="text-xs text-muted-foreground">{log.adminEmail}</span>
                                                    </div>
                                                </TableCell>

                                                <TableCell>
                                                    <Badge
                                                        variant="secondary"
                                                        className={`${actionTypeColors[log.actionType] || 'bg-gray-600'} text-white`}
                                                    >
                                                        {getActionLabel(log.actionType)}
                                                    </Badge>
                                                </TableCell>

                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <TargetIcon className="h-4 w-4 text-muted-foreground" />
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-medium capitalize">{log.targetType}</span>
                                                            {log.targetName && (
                                                                <span className="text-xs text-muted-foreground">{log.targetName}</span>
                                                            )}
                                                            {log.targetId && (
                                                                <Link
                                                                    href={getTargetLink(log.targetType, log.targetId)}
                                                                    className="text-xs text-blue-600 hover:underline"
                                                                >
                                                                    View {log.targetType}
                                                                </Link>
                                                            )}
                                                        </div>
                                                    </div>
                                                </TableCell>

                                                <TableCell className="max-w-xs">
                                                    {log.details && Object.keys(log.details).length > 0 ? (
                                                        <div className="text-xs space-y-1">
                                                            {Object.entries(log.details).slice(0, 3).map(([key, value]) => (
                                                                <div key={key} className="flex gap-1">
                                                                    <span className="font-semibold">{formatKey(key)}:</span>
                                                                    <span className="text-muted-foreground truncate">{formatValue(value)}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground">No additional details</span>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

function getTargetLink(targetType: string, targetId: string): string {
    switch (targetType) {
        case 'user':
            return `/dashboard/users/${targetId}`;
        case 'job':
            return `/dashboard/jobs/${targetId}`;
        case 'dispute':
            return `/dashboard/disputes/${targetId}`;
        case 'transaction':
            return `/dashboard/transactions`;
        default:
            return '/dashboard';
    }
}

function formatKey(key: string): string {
    return key.split(/(?=[A-Z])/).join(' ').replace(/^\w/, c => c.toUpperCase());
}

function formatValue(value: any): string {
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
}
