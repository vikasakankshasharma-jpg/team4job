
"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Lock, Zap, Target, IndianRupee, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { User, Job } from "@/lib/types";
import { recommendJobsAction } from "@/app/actions/ai.actions";
import { type RecommendJobsOutput } from "@/domains/ai/ai.types";
import { collection, query, where, getDocs, limit, orderBy } from "firebase/firestore";
import { useFirebase } from "@/infrastructure/firebase/client-provider";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/ui/empty-state";
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { toDate } from '@/lib/utils';

interface RecommendedJobsProps {
    user: User;
}

export function RecommendedJobsList({ user }: RecommendedJobsProps) {
    const { db } = useFirebase();
    const router = useRouter();
    const t = useTranslations('dashboard.recommender');
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
            const q = query(
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
            const actionResult = await recommendJobsAction({
                professionalSkills: user.professionalProfile?.skills || [],
                professionalLocation: user.pincodes?.residential || '',
                jobs: aiInputJobs
            });

            if (actionResult.success && actionResult.data) {
                setRecommendations(actionResult.data.recommendations);
                setAvailableJobs(jobs);
            }

        } catch (e) {
            // Silently handle recommendation failure
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
                        {t('neuralMatch')}
                    </CardTitle>
                    <CardDescription className="text-slate-300">
                        {t('aiPoweredDesc')}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-2 text-sm">
                            <Lock className="h-4 w-4 text-amber-400" />
                            <span>{t('smartInvitesDesc')}</span>
                        </div>
                        <Button
                            variant="secondary"
                            className="w-full bg-amber-500 hover:bg-amber-600 text-foreground border-none"
                            onClick={() => router.push('/dashboard/subscription-plans')}
                        >
                            {t('upgradeToUnlock')}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-amber-500/10 rounded-xl">
                        <Sparkles className="h-6 w-6 text-amber-500 animate-pulse" />
                    </div>
                    <h2 className="text-3xl font-black italic tracking-tighter uppercase">{t('topPicks')}</h2>
                </div>
                <Button variant="outline" size="lg" className="rounded-full border-primary/20 text-xs font-black uppercase tracking-widest hover:bg-primary/5" onClick={fetchRecommendations} disabled={isLoading}>
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2 text-primary" />}
                    {isLoading ? 'Scanning...' : t('refresh')}
                </Button>
            </div>

            <div className="relative">
                {/* Horizontal Scroll Container */}
                <div className="flex overflow-x-auto gap-6 pb-8 snap-x snap-mandatory hide-scrollbar" style={{ scrollbarWidth: 'none' }}>
                    {recommendations.length > 0 ? (
                        recommendations.map((rec, idx) => {
                            const job = availableJobs.find(j => j.id === rec.jobId);
                            if (!job) return null;
                            return (
                                <motion.div 
                                    key={rec.jobId}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                    className="snap-center shrink-0 w-[85vw] sm:w-[400px]"
                                >
                                    <Link href={`/dashboard/jobs/${rec.jobId}`} className="block h-full">
                                        <Card className="h-full border-none bg-surface-container-low/40 dark:bg-slate-900/60 backdrop-blur-3xl shadow-[0_20px_40px_rgba(0,0,0,0.1)] rounded-[2.5rem] overflow-hidden group ring-1 ring-white/5 hover:ring-primary/30 transition-all hover:-translate-y-2 relative">
                                            <div className="absolute top-0 right-0 p-6 opacity-5 scale-150 rotate-12 group-hover:scale-[2] group-hover:text-primary transition-all duration-700">
                                                <Target className="h-24 w-24" />
                                            </div>
                                            <CardHeader className="pb-4 relative z-10">
                                                <div className="flex justify-between items-start gap-4 mb-2">
                                                    <CardTitle className="text-xl font-bold line-clamp-2 leading-tight">{job.title}</CardTitle>
                                                    <Badge className="bg-green-500 text-white border-none shadow-lg shadow-green-500/20 text-xs font-black uppercase tracking-widest italic shrink-0">
                                                        {t('matchScore', { score: rec.score })}%
                                                    </Badge>
                                                </div>
                                                <div className="flex gap-3 text-xs text-muted-foreground font-medium uppercase tracking-widest italic opacity-80">
                                                    <span className="flex items-center gap-1"><Zap className="h-3 w-3" /> {job.location}</span>
                                                    <span className="flex items-center gap-1"><IndianRupee className="h-3 w-3" /> {job.priceEstimate ? `${job.priceEstimate.min}-${job.priceEstimate.max}` : 'TBD'}</span>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="relative z-10">
                                                <p className="text-sm text-muted-foreground line-clamp-3 mb-6">
                                                    <span className="font-bold text-primary mr-2 italic">Why you?</span> 
                                                    {rec.reason}
                                                </p>
                                                <div className="flex items-center text-xs font-black uppercase tracking-widest text-primary group-hover:underline italic">
                                                    View Details <ArrowRight className="ml-2 h-4 w-4" />
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </Link>
                                </motion.div>
                            )
                        })
                    ) : (
                        <div className="w-full">
                            {isLoading ? (
                                <div className="py-20 text-muted-foreground text-center flex flex-col items-center justify-center gap-4 bg-surface-container-low/20 rounded-[3rem] border border-dashed border-white/10">
                                    <Loader2 className="h-10 w-10 animate-spin text-primary opacity-50" /> 
                                    <p className="text-sm font-black uppercase tracking-widest italic opacity-60">Quantum matching in progress...</p>
                                </div>
                            ) : (
                                <EmptyState
                                    icon={Sparkles}
                                    title={t('noMatches')}
                                    description={t('noMatchesDesc')}
                                    className="border border-dashed border-white/10 bg-surface-container-low/20 rounded-[3rem] min-h-[300px] p-10 shadow-none"
                                />
                            )}
                        </div>
                    )}
                </div>
            </div>
            
            {!isLoading && recommendations.length === 0 && (
                <div className="text-center mt-4">
                    <Button variant="default" size="lg" className="rounded-full shadow-xl shadow-primary/20 font-black uppercase tracking-widest text-xs italic" onClick={fetchRecommendations}>
                        {t('scanJobs')}
                    </Button>
                </div>
            )}
        </div>
    );
}
