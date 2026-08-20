"use client";

import { useEffect, useState } from "react";
import { useFirebase } from "@/infrastructure/firebase/client-provider";
import { QuickMetricCard } from "@/components/dashboard/quick-metric-card";
import { Target, Clock, Star, Users } from "lucide-react";
import { collection, query, where, getDocs, Timestamp } from "firebase/firestore";
import { Job, User } from "@/lib/types";

import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface QuickMetricsRowProps {
    userId: string;
    user: User;
}

interface QuickMetrics {
    avgBidsPerJob: number;
    avgTimeToFirstBid: string;
    pendingReviews: number;
    favoriteProfessionals: number;
}

function calculateMetrics(jobs: Job[], currentUser: User): QuickMetrics {
    // 1. Average Bids Per Job
    const jobsWithBids = jobs.filter(job => job.bids && job.bids.length > 0);
    const totalBids = jobsWithBids.reduce((sum, job) => sum + (job.bids?.length || 0), 0);
    const avgBidsPerJob = jobsWithBids.length > 0 ? totalBids / jobsWithBids.length : 0;

    // 2. Average Time to First Bid
    let avgTimeToFirstBid = "No data";
    try {
        if (jobsWithBids.length > 0) {
            const timeDifferences: number[] = [];

            jobsWithBids.forEach(job => {
                if (!job.postedAt || !job.bids) return;

                try {
                    let postedAt: Date;
                    if (job.postedAt instanceof Timestamp) {
                        postedAt = job.postedAt.toDate();
                    } else {
                        postedAt = new Date(job.postedAt);
                    }

                    if (isNaN(postedAt.getTime())) {
                        return;
                    }

                    // Find earliest bid time
                    let earliestBidTime: number | null = null;

                    job.bids.forEach(bid => {
                        if (!bid.timestamp) return;

                        let bidDate: Date;
                        if (bid.timestamp instanceof Timestamp) {
                            bidDate = bid.timestamp.toDate();
                        } else {
                            bidDate = new Date(bid.timestamp);
                        }

                        if (!isNaN(bidDate.getTime())) {
                            if (earliestBidTime === null || bidDate.getTime() < earliestBidTime) {
                                earliestBidTime = bidDate.getTime();
                            }
                        }
                    });

                    if (earliestBidTime !== null) {
                        const diff = earliestBidTime - postedAt.getTime();
                        if (diff >= 0 && isFinite(diff)) {
                            timeDifferences.push(diff);
                        }
                    }
                } catch (innerErr) {
                    // Skip invalid job calculations
                }
            });

            avgTimeToFirstBid = "~";
        }
    } catch (e) {
        avgTimeToFirstBid = "Error";
    }

    // 3. Pending Reviews (Completed jobs without ratings)
    const pendingReviews = jobs.filter(
        job => job.status === "Completed" && !job.professionalReview
    ).length;

    // 4. Favorite Professionals Count
    const favoriteProfessionals = currentUser.favoriteProfessionalIds?.length || 0;

    return {
        avgBidsPerJob: Math.round(avgBidsPerJob * 10) / 10,
        avgTimeToFirstBid,
        pendingReviews,
        favoriteProfessionals,
    };
}

export function JobsMetricsRow({ userId, user }: QuickMetricsRowProps) {
    const { db } = useFirebase();
    const router = useRouter();
    const [metrics, setMetrics] = useState<QuickMetrics | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMetrics = async () => {
            if (!db) return;

            try {
                setLoading(true);

                // Calculate date 90 days ago
                const ninetyDaysAgo = new Date();
                ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

                // Query jobs from last 90 days
                const jobsQuery = query(
                    collection(db, "jobs"),
                    where("clientId", "==", userId),
                    where("postedAt", ">=", Timestamp.fromDate(ninetyDaysAgo))
                );

                const jobsSnapshot = await getDocs(jobsQuery);
                const jobs = jobsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Job));

                // Calculate metrics
                let calculatedMetrics: QuickMetrics = {
                    avgBidsPerJob: 0,
                    avgTimeToFirstBid: "No data",
                    pendingReviews: 0,
                    favoriteProfessionals: 0
                };

                try {
                    calculatedMetrics = calculateMetrics(jobs, user);
                } catch (calcError) {
                    // Fallback handled by default initialization
                }
                setMetrics(calculatedMetrics);
            } catch (error) {
                // Silently handle failure
            } finally {
                setLoading(false);
            }
        };

        fetchMetrics();
    }, [db, userId, user]);

    if (loading) {
        return (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {[1, 2, 3, 4].map(i => (
                    <Skeleton key={i} className="h-32" />
                ))}
            </div>
        );
    }

    if (!metrics) return null;

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <QuickMetricCard
                label="Avg Bids/Job"
                value={metrics.avgBidsPerJob.toFixed(1)}
                icon={Target}
                tooltip="Average number of bids you receive per job (last 90 days)"
                className="h-full"
            />

            <QuickMetricCard
                label="Time to 1st Bid"
                value={metrics.avgTimeToFirstBid}
                icon={Clock}
                tooltip="Average time before receiving your first bid"
                className="h-full"
            />

            <QuickMetricCard
                label="Pending Reviews"
                value={metrics.pendingReviews}
                icon={Star}
                actionable={metrics.pendingReviews > 0}
                onClick={
                    metrics.pendingReviews > 0
                        ? () => router.push("/dashboard/posted-jobs?tab=completed")
                        : undefined
                }
                tooltip={
                    metrics.pendingReviews > 0
                        ? "Click to review completed jobs"
                        : "All completed jobs have been reviewed"
                }
                className={cn(
                    "h-full",
                    metrics.pendingReviews > 0 ? "border-amber-200 bg-amber-50/30 dark:border-amber-900/30 dark:bg-amber-950/20" : ""
                )}
            />

            <QuickMetricCard
                label="Your Network"
                value={metrics.favoriteProfessionals}
                icon={Users}
                onClick={() => router.push("/dashboard/my-professionals?tab=favorites")}
                actionable
                tooltip="Professionals you've favorited. Click to view them."
                className="h-full"
            />
        </div>
    );
}

