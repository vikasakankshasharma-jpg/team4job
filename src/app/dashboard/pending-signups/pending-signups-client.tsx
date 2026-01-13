"use client";

import { useState, useEffect } from "react";
import { useUser } from "@/hooks/use-user";
import { useFirestore } from "@/lib/firebase/client-provider";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import type { PendingSignup } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Phone, Mail, MessageSquare, MoreVertical, Calendar, XCircle, Star, History, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { StatusBadge } from "@/components/pending-signups/status-badge";
import { PriorityBadge } from "@/components/pending-signups/priority-badge";
import { ScheduleFollowUpDialog } from "@/components/pending-signups/schedule-followup-dialog";
import { MarkAsDeniedDialog } from "@/components/pending-signups/mark-denied-dialog";
import { ActivityTimelineDialog } from "@/components/pending-signups/activity-timeline-dialog";
import {
    scheduleFollowUp,
    markAsDenied,
    addActivityLog,
    updateSignupStatus,
    getTodaysFollowUps,
    getOverdueFollowUps,
} from "@/lib/followup-manager";

export default function PendingSignupsClient() {
    const { user, isAdmin } = useUser();
    const db = useFirestore();
    const { toast } = useToast();

    const [signups, setSignups] = useState<PendingSignup[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [priorityFilter, setPriorityFilter] = useState("all");
    const [roleFilter, setRoleFilter] = useState("all");
    const [activeTab, setActiveTab] = useState("all");

    // Dialog states
    const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
    const [denialDialogOpen, setDenialDialogOpen] = useState(false);
    const [timelineDialogOpen, setTimelineDialogOpen] = useState(false);
    const [selectedSignup, setSelectedSignup] = useState<PendingSignup | null>(null);

    // Fetch signups
    useEffect(() => {
        if (!db || !isAdmin) return;

        const q = query(
            collection(db, "pending_signups"),
            where("converted", "==", false),
            orderBy("lastActiveAt", "desc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map((doc) => ({
                ...doc.data(),
                id: doc.id,
            })) as PendingSignup[];
            setSignups(data);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [db, isAdmin]);

    if (!isAdmin) {
        return <div className="p-8 text-center">Access denied. Admin only.</div>;
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    // Helper function
    const toDate = (timestamp: any) => {
        if (!timestamp) return new Date();
        if (timestamp instanceof Date) return timestamp;
        return timestamp.toDate();
    };

    // Filter signups
    const filteredSignups = signups.filter((signup) => {
        const matchesSearch =
            signup.mobile.includes(searchQuery) ||
            signup.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            signup.name?.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesStatus = statusFilter === "all" || signup.status === statusFilter;
        const matchesPriority = priorityFilter === "all" || signup.priority === priorityFilter;
        const matchesRole = roleFilter === "all" || signup.role === roleFilter;

        return matchesSearch && matchesStatus && matchesPriority && matchesRole;
    });

    // Tab-specific filtering
    const getTabSignups = () => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        switch (activeTab) {
            case "today":
                return filteredSignups.filter((s) => {
                    if (!s.followUpDate) return false;
                    const followUpDate = toDate(s.followUpDate);
                    return followUpDate >= today && followUpDate < tomorrow;
                });
            case "overdue":
                return filteredSignups.filter((s) => {
                    if (!s.followUpDate) return false;
                    return toDate(s.followUpDate) < now && s.status !== "denied";
                });
            case "high_priority":
                return filteredSignups.filter((s) => s.priority === "high");
            default:
                return filteredSignups;
        }
    };

    const tabSignups = getTabSignups();

    // Stats
    const stats = {
        total: signups.filter((s) => !s.converted).length,
        new: signups.filter((s) => s.status === "new").length,
        contacted: signups.filter((s) => s.status === "contacted" || s.contacted).length,
        followUp: signups.filter((s) => s.status === "follow_up").length,
        denied: signups.filter((s) => s.status === "denied").length,
        today: signups.filter((s) => {
            if (!s.followUpDate) return false;
            const followUpDate = toDate(s.followUpDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            return followUpDate >= today && followUpDate < tomorrow;
        }).length,
        overdue: signups.filter((s) => {
            if (!s.followUpDate) return false;
            return toDate(s.followUpDate) < new Date() && s.status !== "denied";
        }).length,
    };

    // Action handlers
    const handleScheduleFollowUp = async (data: any) => {
        if (!selectedSignup || !db || !user) return;

        try {
            await scheduleFollowUp(
                db,
                selectedSignup.mobile,
                data.date,
                data.priority,
                user.id,
                user.name || "Admin",
                data.notes,
                data.nextAction
            );

            toast({
                title: "Follow-up scheduled",
                description: `Scheduled for ${data.date.toLocaleString()}`,
            });
        } catch (error) {
            console.error("Error scheduling follow-up:", error);
            toast({
                title: "Error",
                description: "Failed to schedule follow-up",
                variant: "destructive",
            });
        }
    };

    const handleMarkDenied = async (data: any) => {
        if (!selectedSignup || !db || !user) return;

        try {
            await markAsDenied(
                db,
                selectedSignup.mobile,
                data.reason,
                data.customReason,
                user.id,
                user.name || "Admin",
                data.notes
            );

            toast({
                title: "Marked as denied",
                description: "User has been marked as denied",
            });
        } catch (error) {
            console.error("Error marking as denied:", error);
            toast({
                title: "Error",
                description: "Failed to mark as denied",
                variant: "destructive",
            });
        }
    };

    const handleAddActivity = async (signup: PendingSignup, action: "call" | "sms" | "email") => {
        if (!db || !user) return;

        try {
            await addActivityLog(
                db,
                signup.mobile,
                user.id,
                user.name || "Admin",
                action,
                undefined,
                `Contacted via ${action}`
            );

            toast({
                title: "Activity logged",
                description: `${action.toUpperCase()} contact logged`,
            });
        } catch (error) {
            console.error("Error logging activity:", error);
            toast({
                title: "Error",
                description: "Failed to log activity",
                variant: "destructive",
            });
        }
    };

    const handleSetPriority = async (signup: PendingSignup, priority: "high" | "medium" | "low") => {
        if (!db || !user) return;

        try {
            await updateSignupStatus(db, signup.mobile, signup.status, priority, user.id, user.name || "Admin");
            toast({
                title: "Priority updated",
                description: `Set to ${priority} priority`,
            });
        } catch (error) {
            console.error("Error updating priority:", error);
            toast({
                title: "Error",
                description: "Failed to update priority",
                variant: "destructive",
            });
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Pending Signups CRM</h1>
                <p className="text-muted-foreground">Manage and follow up with incomplete signups</p>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-7">
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Total Pending</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.total}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">New Leads</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.new}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Contacted</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.contacted}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Follow-Ups</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.followUp}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Today&apos;s Queue</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600">{stats.today}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Overdue</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Denied</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-gray-500">{stats.denied}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="all">All ({filteredSignups.length})</TabsTrigger>
                    <TabsTrigger value="today">
                        Today&apos;s Follow-Ups ({stats.today})
                        {stats.today > 0 && <Badge className="ml-2 bg-orange-500">{stats.today}</Badge>}
                    </TabsTrigger>
                    <TabsTrigger value="overdue">
                        Overdue ({stats.overdue})
                        {stats.overdue > 0 && <Badge className="ml-2 bg-red-500">{stats.overdue}</Badge>}
                    </TabsTrigger>
                    <TabsTrigger value="high_priority">
                        High Priority
                    </TabsTrigger>
                </TabsList>

                <TabsContent value={activeTab} className="space-y-4">
                    {/* Filters */}
                    <div className="flex flex-col gap-4 md:flex-row md:items-end">
                        <div className="flex-1">
                            <Input
                                placeholder="Search by mobile, email, or name..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                <SelectItem value="new">New</SelectItem>
                                <SelectItem value="contacted">Contacted</SelectItem>
                                <SelectItem value="follow_up">Follow-Up</SelectItem>
                                <SelectItem value="busy">Busy</SelectItem>
                                <SelectItem value="denied">Denied</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Priority" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Priorities</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="low">Low</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={roleFilter} onValueChange={setRoleFilter}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Role" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Roles</SelectItem>
                                <SelectItem value="Installer">Installer</SelectItem>
                                <SelectItem value="Job Giver">Job Giver</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Table */}
                    <Card>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Contact</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Priority</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Follow-Up</TableHead>
                                    <TableHead>Last Active</TableHead>
                                    <TableHead>Attempts</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {tabSignups.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                            No pending signups found
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    tabSignups.map((signup) => (
                                        <TableRow key={signup.id} className="cursor-pointer hover:bg-muted/50">
                                            <TableCell>
                                                <div className="font-medium">{signup.mobile}</div>
                                                <div className="text-sm text-muted-foreground">{signup.email || "-"}</div>
                                                <div className="text-sm text-muted-foreground">{signup.name || "-"}</div>
                                            </TableCell>
                                            <TableCell>
                                                <StatusBadge status={signup.status || "new"} />
                                            </TableCell>
                                            <TableCell>
                                                <PriorityBadge priority={signup.priority || "medium"} />
                                            </TableCell>
                                            <TableCell>
                                                {signup.role ? <Badge variant="outline">{signup.role}</Badge> : "-"}
                                            </TableCell>
                                            <TableCell>
                                                {signup.followUpDate ? (
                                                    <div className="text-sm">
                                                        {toDate(signup.followUpDate).toLocaleDateString()}
                                                        <br />
                                                        <span className="text-muted-foreground">
                                                            {toDate(signup.followUpDate).toLocaleTimeString([], {
                                                                hour: "2-digit",
                                                                minute: "2-digit",
                                                            })}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    "-"
                                                )}
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {formatDistanceToNow(toDate(signup.lastActiveAt), { addSuffix: true })}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary">{signup.totalContactAttempts || 0}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex gap-2">
                                                    {/* Quick actions */}
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => {
                                                            window.location.href = `tel:${signup.mobile}`;
                                                            handleAddActivity(signup, "call");
                                                        }}
                                                        title="Call"
                                                    >
                                                        <Phone className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => {
                                                            window.location.href = `sms:${signup.mobile}`;
                                                            handleAddActivity(signup, "sms");
                                                        }}
                                                        title="SMS"
                                                    >
                                                        <MessageSquare className="h-4 w-4" />
                                                    </Button>
                                                    {signup.email && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => {
                                                                window.location.href = `mailto:${signup.email}`;
                                                                handleAddActivity(signup, "email");
                                                            }}
                                                            title="Email"
                                                        >
                                                            <Mail className="h-4 w-4" />
                                                        </Button>
                                                    )}

                                                    {/* More actions dropdown */}
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button size="sm" variant="ghost">
                                                                <MoreVertical className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem
                                                                onClick={() => {
                                                                    setSelectedSignup(signup);
                                                                    setScheduleDialogOpen(true);
                                                                }}
                                                            >
                                                                <Calendar className="mr-2 h-4 w-4" />
                                                                Schedule Follow-Up
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                onClick={() => {
                                                                    setSelectedSignup(signup);
                                                                    setDenialDialogOpen(true);
                                                                }}
                                                            >
                                                                <XCircle className="mr-2 h-4 w-4" />
                                                                Mark as Denied
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                onClick={() => {
                                                                    setSelectedSignup(signup);
                                                                    setTimelineDialogOpen(true);
                                                                }}
                                                            >
                                                                <History className="mr-2 h-4 w-4" />
                                                                View Activity Timeline
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuLabel>Set Priority</DropdownMenuLabel>
                                                            <DropdownMenuItem onClick={() => handleSetPriority(signup, "high")}>
                                                                <Star className="mr-2 h-4 w-4 text-red-500" />
                                                                High Priority
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleSetPriority(signup, "medium")}>
                                                                <Star className="mr-2 h-4 w-4 text-yellow-500" />
                                                                Medium Priority
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleSetPriority(signup, "low")}>
                                                                <Star className="mr-2 h-4 w-4 text-gray-500" />
                                                                Low Priority
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Dialogs */}
            <ScheduleFollowUpDialog
                open={scheduleDialogOpen}
                onOpenChange={setScheduleDialogOpen}
                onSchedule={handleScheduleFollowUp}
                userName={selectedSignup?.name || selectedSignup?.mobile}
            />

            <MarkAsDeniedDialog
                open={denialDialogOpen}
                onOpenChange={setDenialDialogOpen}
                onDeny={handleMarkDenied}
                userName={selectedSignup?.name || selectedSignup?.mobile}
            />

            <ActivityTimelineDialog
                open={timelineDialogOpen}
                onOpenChange={setTimelineDialogOpen}
                activities={selectedSignup?.activityLog || []}
                userName={selectedSignup?.name || selectedSignup?.mobile}
            />
        </div>
    );
}
