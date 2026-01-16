'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useNotifications } from '@/hooks/use-notifications';
import { NotificationList } from '@/components/notifications/notification-list';
import { Separator } from '@/components/ui/separator';
import { Bell, Mail, MessageSquare, Settings } from 'lucide-react';
import { format } from 'date-fns';

export default function NotificationCenterClient() {
    const { notifications, unreadCount, markAsRead, markAllAsRead, preferences, updatePreferences, loading } = useNotifications();
    const [activeTab, setActiveTab] = useState("all");

    const filteredNotifications = activeTab === "all"
        ? notifications
        : activeTab === "unread"
            ? notifications.filter(n => !n.read)
            : notifications; // 'settings' handled by TabsContent

    if (loading) {
        return <div className="p-8 text-center text-muted-foreground">Loading notifications...</div>;
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto p-4 md:p-6 pb-20 md:pb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Notifications</h1>
                    <p className="text-sm md:text-base text-muted-foreground">Stay updated on your jobs and account activity.</p>
                </div>
                {unreadCount > 0 && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => markAllAsRead()}
                        className="w-full sm:w-auto"
                    >
                        Mark all as read
                    </Button>
                )}
            </div>

            <Tabs defaultValue="all" onValueChange={setActiveTab} className="space-y-4">
                <TabsList className="w-full grid grid-cols-3">
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="unread">
                        <span className="hidden sm:inline">Unread</span>
                        <span className="sm:hidden">📬</span>
                        {unreadCount > 0 && <span className="ml-1">({unreadCount})</span>}
                    </TabsTrigger>
                    <TabsTrigger value="settings" className="flex items-center justify-center gap-2">
                        <Settings className="h-3 w-3" />
                        <span className="hidden sm:inline">Preferences</span>
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="space-y-4">
                    <Card>
                        <CardContent className="p-0">
                            <NotificationList
                                notifications={filteredNotifications}
                                onMarkAsRead={markAsRead}
                                className="h-[400px] md:h-[600px]"
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="unread" className="space-y-4">
                    <Card>
                        <CardContent className="p-0">
                            <NotificationList
                                notifications={filteredNotifications}
                                onMarkAsRead={markAsRead}
                                className="h-[400px] md:h-[600px]"
                                emptyMessage="You have no unread notifications."
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="settings">
                    <Card>
                        <CardHeader>
                            <CardTitle>Notification Preferences</CardTitle>
                            <CardDescription>Manage how you want to be notified.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-8">

                            {/* Global Channels */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Channels</h3>
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label className="text-base">In-App Notifications</Label>
                                        <p className="text-sm text-muted-foreground">Receive alerts within the platform</p>
                                    </div>
                                    <Switch
                                        checked={preferences?.channels.inApp ?? true}
                                        onCheckedChange={(c) => updatePreferences(preferences?.userId!, { channels: { ...preferences?.channels!, inApp: c } })}
                                    />
                                </div>
                                <Separator />
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label className="text-base">Email Notifications</Label>
                                        <p className="text-sm text-muted-foreground">Receive digests and important updates via email</p>
                                    </div>
                                    <Switch
                                        checked={preferences?.channels.email ?? true}
                                        onCheckedChange={(c) => updatePreferences(preferences?.userId!, { channels: { ...preferences?.channels!, email: c } })}
                                    />
                                </div>
                            </div>

                            {/* Categories */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Categories</h3>
                                <div className="grid gap-4">
                                    <CategoryToggle
                                        label="Bidding Activity"
                                        desc="New bids, bid updates, shortlists"
                                        checked={preferences?.categories.bidding.enabled ?? true}
                                        onChange={(c) => updatePreferences(preferences?.userId!, { categories: { ...preferences?.categories!, bidding: { ...preferences?.categories.bidding!, enabled: c } } })}
                                    />
                                    <CategoryToggle
                                        label="Payments & finance"
                                        desc="Invoices, payment success/failure"
                                        checked={preferences?.categories.payments.enabled ?? true}
                                        onChange={(c) => updatePreferences(preferences?.userId!, { categories: { ...preferences?.categories!, payments: { ...preferences?.categories.payments!, enabled: c } } })}
                                    />
                                    <CategoryToggle
                                        label="Job Updates"
                                        desc="Status changes, work submissions, deadlines"
                                        checked={preferences?.categories.deadlines.enabled ?? true}
                                        onChange={(c) => updatePreferences(preferences?.userId!, { categories: { ...preferences?.categories!, deadlines: { ...preferences?.categories.deadlines!, enabled: c } } })}
                                    />
                                </div>
                            </div>

                            {/* Quiet Hours */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Quiet Hours</h3>
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label className="text-base">Enable Quiet Hours</Label>
                                        <p className="text-sm text-muted-foreground">Pause notifications during night time</p>
                                    </div>
                                    <Switch
                                        checked={preferences?.quietHours.enabled ?? false}
                                        onCheckedChange={(c) => updatePreferences(preferences?.userId!, { quietHours: { ...preferences?.quietHours!, enabled: c } })}
                                    />
                                </div>
                                {preferences?.quietHours.enabled && (
                                    <div className="flex items-center gap-4 mt-2">
                                        <div className="grid gap-1.5">
                                            <Label htmlFor="start-time">Start Time</Label>
                                            <input
                                                type="time"
                                                id="start-time"
                                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                                value={preferences.quietHours.start}
                                                onChange={(e) => updatePreferences(preferences.userId, { quietHours: { ...preferences.quietHours, start: e.target.value } })}
                                            />
                                        </div>
                                        <div className="grid gap-1.5">
                                            <Label htmlFor="end-time">End Time</Label>
                                            <input
                                                type="time"
                                                id="end-time"
                                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                                value={preferences.quietHours.end}
                                                onChange={(e) => updatePreferences(preferences.userId, { quietHours: { ...preferences.quietHours, end: e.target.value } })}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

function CategoryToggle({ label, desc, checked, onChange }: { label: string, desc: string, checked: boolean, onChange: (c: boolean) => void }) {
    return (
        <div className="flex items-center justify-between border p-3 rounded-lg">
            <div className="space-y-0.5">
                <Label className="text-base font-medium">{label}</Label>
                <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
            <Switch checked={checked} onCheckedChange={onChange} />
        </div>
    );
}
