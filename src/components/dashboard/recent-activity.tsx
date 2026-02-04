
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { Activity as ActivityIcon, Briefcase, CheckCircle, Clock, AlertOctagon, IndianRupee, ShieldCheck } from "lucide-react";
import { useUser, useFirebase } from "@/hooks/use-user";
import { useEffect, useState } from "react";
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { toDate } from "@/lib/utils";
import { Activity } from "@/lib/types";
import { onSnapshot } from "firebase/firestore";
import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";

// ...

export function RecentActivity({ initialActivities = [] }: { initialActivities?: Activity[] }) {
    const { user, role } = useUser();
    const { db } = useFirebase();
    const [activities, setActivities] = useState<Activity[]>(initialActivities);
    const [loading, setLoading] = useState(initialActivities.length === 0);

    useEffect(() => {
        if (!user || !db) return;
        // If we have initial data, we aren't loading, but we still want live updates.
        // However, for optimization, we might skip live updates or delay them.
        // For now, let's keep live updates but set loading to false immediately if we have data.
        if (initialActivities.length > 0) {
            setLoading(false);
        } else {
            setLoading(true);
        }

        const activitiesRef = collection(db, 'activities');
        const q = query(
            activitiesRef,
            where('userId', '==', user.id),
            limit(50)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const newActivities = snapshot.docs
                .map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }))
                .sort((a, b) => toDate((b as any).timestamp).getTime() - toDate((a as any).timestamp).getTime())
                .slice(0, 10) as Activity[];

            setActivities(newActivities);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching activities:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user, db, initialActivities.length]); // Dependence on length to avoid reset loop

    if (loading) {
        return (
            <Card className="col-span-1 md:col-span-2 lg:col-span-1">
                <CardHeader><CardTitle>Recent Activity</CardTitle></CardHeader>
                <CardContent><div className="h-[300px] flex items-center justify-center text-muted-foreground">Loading...</div></CardContent>
            </Card>
        )
    }

    return (
        <Card className="col-span-1 md:col-span-2 lg:col-span-1" data-tour="recent-activity">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <ActivityIcon className="h-5 w-5 text-primary" />
                    Recent Activity
                </CardTitle>
                <CardDescription>Your latest actions and updates.</CardDescription>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[300px] pr-4">
                    {activities.length > 0 ? (
                        <div className="space-y-6">
                            {activities.map((item, index) => (
                                <div key={(item.id || 'activity') + index} className="flex gap-4 relative">
                                    {index !== activities.length - 1 && (
                                        <div className="absolute left-[19px] top-10 bottom-[-24px] w-[2px] bg-border" />
                                    )}
                                    <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted border border-background shadow-sm">
                                        {(item.type === 'job_posted' || item.type === 'job_won') && <Briefcase className="h-5 w-5 text-blue-500" />}
                                        {(item.type === 'payment_released' || item.type === 'payment_received') && <IndianRupee className="h-5 w-5 text-green-500" />}
                                        {item.type === 'job_completed' && <CheckCircle className="h-5 w-5 text-purple-500" />}
                                        {item.type === 'bid_placed' && <AlertOctagon className="h-5 w-5 text-amber-500" />}
                                        {item.type === 'bid_received' && <AlertOctagon className="h-5 w-5 text-amber-500" />}
                                        {item.type === 'new_message' && <ActivityIcon className="h-5 w-5 text-indigo-500" />}
                                    </div>
                                    <div className="flex flex-col gap-1 pb-2">
                                        <Link href={item.link} className="text-sm font-semibold hover:underline">
                                            {item.title}
                                        </Link>
                                        <span className="text-xs text-muted-foreground line-clamp-1">
                                            {item.description}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            {formatDistanceToNow(toDate(item.timestamp), { addSuffix: true })}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <EmptyState
                            icon={ActivityIcon}
                            title="No recent activity"
                            description="Your recent jobs and transactions will appear here."
                            className="border-0 min-h-[250px] shadow-none"
                        />
                    )}
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
