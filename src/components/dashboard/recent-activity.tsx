
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { Activity, Briefcase, CheckCircle, Clock, AlertOctagon, IndianRupee, ShieldCheck } from "lucide-react";
import { useUser, useFirebase } from "@/hooks/use-user";
import { useEffect, useState } from "react";
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { toDate } from "@/lib/utils";
import Link from "next/link";

type ActivityType = {
    id: string;
    type: 'job_posted' | 'bid_placed' | 'job_awarded' | 'job_completed' | 'payment_released' | 'dispute_opened';
    title: string;
    description: string;
    timestamp: any;
    link: string;
    metadata?: any;
};

export function RecentActivity() {
    const { user, role } = useUser();
    const { db } = useFirebase();
    const [activities, setActivities] = useState<ActivityType[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchActivity() {
            if (!user || !db || !role) return;
            setLoading(true);

            // In a real app, you might have a dedicated 'activities' collection.
            // For now, we'll synthesize activity from Jobs and Transactions for a quick win.
            // This is a simplified "Recent Activity" based on actual data.

            try {
                const newActivities: ActivityType[] = [];

                // 1. Fetch recent jobs (Posted or Awarded)
                const jobsRef = collection(db, 'jobs');
                let jobsQuery;
                if (role === 'Job Giver') {
                    jobsQuery = query(jobsRef, where('jobGiverId', '==', user.id), orderBy('postedAt', 'desc'), limit(5));
                } else {
                    // For installers, finding 'recent bids' is harder without a composite index on subcollections.
                    // We'll stick to 'jobs awarded' or 'jobs completed' which are easier to query if we had a proper index.
                    // Fallback: Query jobs where I am the awarded installer
                    // Note: This requires an index on awardedInstaller + status/postedAt usually.
                    // Simpler approach for now: Local synthesis limited to what we can easily query or mock for demonstration.
                    // Let's just mock 'No recent activity' if complexity is too high for this step without proper backend tracking.
                    // actually, let's try to fetch transactions as they are good proxies for activity.
                    jobsQuery = null;
                }

                if (jobsQuery) {
                    const jobsSnap = await getDocs(jobsQuery);
                    jobsSnap.forEach(doc => {
                        const job = doc.data();
                        newActivities.push({
                            id: doc.id,
                            type: 'job_posted',
                            title: 'New Job Posted',
                            description: job.title,
                            timestamp: job.postedAt,
                            link: `/dashboard/jobs/${doc.id}`
                        });
                    });
                }

                // 2. Fetch Recent Transactions (Payments)
                const txRef = collection(db, 'transactions');
                const txQuery = query(
                    txRef,
                    where(role === 'Job Giver' ? 'payerId' : 'payeeId', '==', user.id),
                    orderBy('createdAt', 'desc'),
                    limit(5)
                );

                const txSnap = await getDocs(txQuery);
                txSnap.forEach(doc => {
                    const tx = doc.data();
                    newActivities.push({
                        id: doc.id,
                        type: 'payment_released',
                        title: tx.type === 'Escrow Funding' ? 'Funds Deposited' : 'Payment Released',
                        description: `₹${tx.amount.toLocaleString()} for job ${tx.jobId}`,
                        timestamp: tx.createdAt,
                        link: `/dashboard/jobs/${tx.jobId}`
                    });
                });

                // Sort combined
                newActivities.sort((a, b) => toDate(b.timestamp).getTime() - toDate(a.timestamp).getTime());
                setActivities(newActivities.slice(0, 5));

            } catch (err) {
                console.error("Failed to fetch activity", err);
            } finally {
                setLoading(false);
            }
        }

        fetchActivity();
    }, [user, db, role]);

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
                    <Activity className="h-5 w-5 text-primary" />
                    Recent Activity
                </CardTitle>
                <CardDescription>Your latest actions and updates.</CardDescription>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[300px] pr-4">
                    {activities.length > 0 ? (
                        <div className="space-y-6">
                            {activities.map((item, index) => (
                                <div key={item.id + index} className="flex gap-4 relative">
                                    {index !== activities.length - 1 && (
                                        <div className="absolute left-[19px] top-10 bottom-[-24px] w-[2px] bg-border" />
                                    )}
                                    <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted border border-background shadow-sm">
                                        {item.type === 'job_posted' && <Briefcase className="h-5 w-5 text-blue-500" />}
                                        {item.type === 'payment_released' && <IndianRupee className="h-5 w-5 text-green-500" />}
                                        {item.type === 'job_completed' && <CheckCircle className="h-5 w-5 text-purple-500" />}
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
                        <div className="flex h-full flex-col items-center justify-center gap-4 text-center mt-10">
                            <div className="p-4 rounded-full bg-muted">
                                <Activity className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <div className="max-w-[200px]">
                                <p className="font-medium">No recent activity</p>
                                <p className="text-xs text-muted-foreground">Your recent jobs and transactions will appear here.</p>
                            </div>
                        </div>
                    )}
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
