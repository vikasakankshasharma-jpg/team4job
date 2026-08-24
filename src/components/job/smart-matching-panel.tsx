"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Brain, Star, CheckCircle, ExternalLink, Loader2 } from "lucide-react";
import { getSmartMatchesAction } from '@/app/actions/matching.actions';
import { RecommendedInstallerDTO } from '@/domains/matching/matching.types';

export function SmartMatchingPanel({ jobId, onInvite }: { jobId: string, onInvite?: (profId: string) => void }) {
    const [matches, setMatches] = useState<RecommendedInstallerDTO[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;
        async function fetchMatches() {
            setLoading(true);
            try {
                const res = await getSmartMatchesAction(jobId);
                if (mounted) {
                    if (res.success && res.data) {
                        setMatches(res.data);
                    } else {
                        setError(res.error || 'Could not load recommendations');
                    }
                }
            } catch (err: any) {
                if (mounted) setError(err.message);
            } finally {
                if (mounted) setLoading(false);
            }
        }
        fetchMatches();
        return () => { mounted = false; };
    }, [jobId]);

    if (loading) {
        return (
            <Card className="mt-8 border-primary/20 bg-primary/5">
                <CardContent className="p-8 flex justify-center items-center">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <span className="ml-3 font-medium">Finding best matches...</span>
                </CardContent>
            </Card>
        );
    }

    if (error || matches.length === 0) {
        return null; // Fail gracefully
    }

    return (
        <Card className="mt-8 border-primary/20 bg-surface-container-low overflow-hidden">
            <CardHeader className="bg-primary/5 border-b pb-4">
                <div className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Recommended Installers</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="divide-y">
                    {matches.map((match, i) => (
                        <div key={match.professionalId} className="p-4 sm:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-muted/50 transition-colors">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <h4 className="font-semibold text-lg">{match.name}</h4>
                                    {match.isPreviousInstallerAtSite && (
                                        <Badge variant="default" className="text-[10px] uppercase bg-green-600">Past Performer</Badge>
                                    )}
                                </div>
                                <div className="flex items-center gap-3 text-sm text-muted-foreground mb-2">
                                    <span className="flex items-center text-amber-500 font-medium">
                                        <Star className="h-4 w-4 mr-1 fill-current" /> {match.rating} ({match.reviewsCount})
                                    </span>
                                    <span>•</span>
                                    <span className={match.tier === 'Platinum' || match.tier === 'Gold' ? 'text-primary font-medium' : ''}>
                                        {match.tier} Tier
                                    </span>
                                    <span>•</span>
                                    <span className="font-medium">Score: {match.matchScore}/100</span>
                                </div>
                                <p className="text-sm italic text-muted-foreground bg-muted p-2 rounded-md inline-block">
                                    "{match.aiExplanation}"
                                </p>
                            </div>
                            <div className="flex gap-2 w-full sm:w-auto">
                                <Button variant="outline" size="sm" onClick={() => window.open("/dashboard/users/" + match.professionalId, '_blank')}>
                                    <ExternalLink className="h-4 w-4 mr-2" /> Profile
                                </Button>
                                {onInvite && (
                                    <Button size="sm" onClick={() => onInvite(match.professionalId)}>
                                        Invite to Bid
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
