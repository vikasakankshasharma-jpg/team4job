
"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Lock, Zap } from "lucide-react";
import { User, Job } from "@/lib/types";
import { recommendJobs, RecommendJobsOutput } from "@/ai/flows/recommend-jobs";
import { collection, query, where, getDocs, limit, orderBy } from "firebase/firestore";
import { useFirebase } from "@/hooks/use-user";
import { useRouter } from "next/navigation";

import { toDate } from '@/lib/utils';

interface RecommendedJobsProps {
    user: User;
}

export function RecommendedJobs({ user }: RecommendedJobsProps) {
    const { db } = useFirebase();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [recommendations, setRecommendations] = useState<RecommendJobsOutput['recommendations']>([]);
    const [availableJobs, setAvailableJobs] = useState<Job[]>([]); // Store full job objects

    const isSubscribed = user.subscription && toDate(user.subscription.expiresAt) > new Date();

    const fetchRecommendations = async () => {
        if (!db) return;
        setIsLoading(true);

        try {
            // 1. Fetch potential jobs (Open for Bidding)
            // Optimization: Limit to recent 20 jobs to save AI tokens, filter by city if possible
            const jobsRef = collection(db, 'jobs');
            let q = query(
                jobsRef,
                where('status', '==', 'Open for Bidding'),
                orderBy('postedAt', 'desc'),
                limit(20)
            );

            // Client-side filtering for location if needed, but Firestore query is better
            // Ideally we filter by user.address.cityPincode but for MVP we fetch recent

            const snapshot = await getDocs(q);
            const jobs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Job));

            // Convert to format for AI
            const aiInputJobs = jobs.map(j => ({
                id: j.id,
                title: j.title,
                description: j.description || '',
                location: j.location,
                skills: j.skills
            }));

            // 2. Call AI
            const results = await recommendJobs({
                installerSkills: user.installerProfile?.skills || [],
                installerLocation: user.pincodes?.residential || '',
                jobs: aiInputJobs
            });

            setRecommendations(results.recommendations);
            setAvailableJobs(jobs);

        } catch (e) {
            console.error("Failed to fetch recommendations", e);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isSubscribed) {
        return (
            <Card className="bg-gradient-to-r from-slate-900 to-slate-800 text-white border-none overflow-hidden relative">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Zap className="h-32 w-32" />
                </div>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-amber-400">
                        <Sparkles className="h-5 w-5" />
                        Neural Match
                    </CardTitle>
                    <CardDescription className="text-slate-300">
                        Get AI-powered job recommendations tailored to your skills and location.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-2 text-sm">
                            <Lock className="h-4 w-4 text-amber-400" />
                            <span>Unlock &quot;Smart Invites&quot; and see jobs 3x faster.</span>
                        </div>
                        <Button
                            variant="secondary"
                            className="w-full bg-amber-500 hover:bg-amber-600 text-black border-none"
                            onClick={() => router.push('/dashboard/subscription-plans')}
                        >
                            Upgrade to Unlock
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800">
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-lg">
                    <span className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-amber-500" />
                        Top Picks for You
                    </span>
                    <Button variant="ghost" size="sm" onClick={fetchRecommendations} disabled={isLoading}>
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
                    </Button>
                </CardTitle>
            </CardHeader>
            <CardContent>
                {recommendations.length > 0 ? (
                    <div className="space-y-3">
                        {recommendations.map(rec => {
                            const job = availableJobs.find(j => j.id === rec.jobId);
                            if (!job) return null;
                            return (
                                <div key={rec.jobId} className="p-3 bg-white dark:bg-slate-950 rounded-lg border shadow-sm hover:shadow-md transition-all cursor-pointer" onClick={() => router.push(`/dashboard/jobs/${rec.jobId}`)}>
                                    <div className="flex justify-between items-start mb-1">
                                        <h4 className="font-semibold text-sm line-clamp-1">{job.title}</h4>
                                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                                            {rec.score}% Match
                                        </Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                                        {rec.reason}
                                    </p>
                                    <div className="flex gap-2 text-xs text-slate-500">
                                        <span>📍 {job.location}</span>
                                        <span>💰 ₹{job.priceEstimate ? `${job.priceEstimate.min} - ${job.priceEstimate.max}` : 'Budget TBD'}</span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    <div className="text-center py-6 text-muted-foreground text-sm">
                        {isLoading ? "Analyzing marketplace..." : "No perfect matches found right now. Check back later!"}
                    </div>
                )}
                {!isLoading && recommendations.length === 0 && <Button variant="outline" className="w-full mt-4" onClick={fetchRecommendations}>Scan Jobs</Button>}
            </CardContent>
        </Card>
    );
}
