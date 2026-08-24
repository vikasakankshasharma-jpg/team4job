'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles, Star, MapPin, CheckCircle2 } from 'lucide-react';
import AwardConfirmationModal from './AwardConfirmationModal';
import { Job } from '@/lib/types';

interface Props {
    job: Job;
    recommendation: any;
    onAwarded: (updatedJob: Job) => void;
}

export default function InstallerRecommendationCard({ job, recommendation, onAwarded }: Props) {
    const [isAwardModalOpen, setIsAwardModalOpen] = useState(false);

    const getConfidenceColor = (confidence: string) => {
        switch (confidence.toLowerCase()) {
            case 'high': return 'bg-green-100 text-green-800 border-green-200';
            case 'medium': return 'bg-amber-100 text-amber-800 border-amber-200';
            case 'low': return 'bg-red-100 text-red-800 border-red-200';
            default: return 'bg-slate-100 text-slate-800 border-slate-200';
        }
    };

    return (
        <Card className="overflow-hidden">
            <CardContent className="p-0">
                <div className="flex flex-col md:flex-row">
                    {/* Details section */}
                    <div className="p-6 flex-1 flex flex-col justify-between">
                        <div>
                            <div className="flex flex-wrap items-start justify-between mb-2 gap-4">
                                <div>
                                    <h3 className="text-lg font-bold">{recommendation.name || 'Installer Name'}</h3>
                                    <div className="flex flex-wrap items-center gap-2 mt-1">
                                        <Badge variant="outline" className="font-normal bg-primary/5">
                                            {recommendation.tier || 'Bronze'}
                                        </Badge>
                                        <div className="flex items-center text-sm font-medium">
                                            <Star className="h-4 w-4 fill-amber-400 text-amber-400 mr-1" />
                                            {recommendation.rating?.toFixed(1) || '0.0'} <span className="text-muted-foreground ml-1 font-normal">({recommendation.reviewsCount || 0} reviews)</span>
                                        </div>
                                        {(!recommendation.reviewsCount || recommendation.reviewsCount < 5) && (
                                            <Badge variant="secondary" className="font-normal text-xs bg-blue-50 text-blue-700 hover:bg-blue-50">
                                                Emerging Installer
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                                <div className="flex flex-col items-end">
                                    <div className="flex items-center space-x-2">
                                        <span className="text-sm font-semibold text-muted-foreground">{recommendation.matchScore} Match</span>
                                        <Badge className={getConfidenceColor(recommendation.confidence)} variant="outline">
                                            {recommendation.confidence} Confidence
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="bg-primary/5 rounded-md p-4 mt-4 border border-primary/10">
                                <h4 className="text-xs font-semibold text-primary/80 uppercase tracking-wider mb-2">Why Recommended</h4>
                                <div className="flex items-start">
                                    <Sparkles className="h-4 w-4 text-primary mt-0.5 mr-2 shrink-0" />
                                    <p className="text-sm font-medium text-primary-900 leading-relaxed">
                                        {recommendation.aiExplanation}
                                    </p>
                                </div>
                            </div>
                            
                            {/* Score Breakdown (Optional expansion could go here) */}
                            <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
                                {recommendation.scoreBreakdown?.reputationTier > 0 && (
                                    <span className="flex items-center bg-muted px-2 py-1 rounded">
                                        <CheckCircle2 className="h-3 w-3 mr-1" /> Top Tier Professional
                                    </span>
                                )}
                                {recommendation.scoreBreakdown?.location > 10 && (
                                    <span className="flex items-center bg-muted px-2 py-1 rounded">
                                        <MapPin className="h-3 w-3 mr-1" /> Exact Location Match
                                    </span>
                                )}
                            </div>
                        </div>
                        
                        <div className="mt-6 flex justify-end">
                            <Button onClick={() => setIsAwardModalOpen(true)}>
                                Select for Award
                            </Button>
                        </div>
                    </div>
                </div>
            </CardContent>

            {isAwardModalOpen && (
                <AwardConfirmationModal 
                    isOpen={isAwardModalOpen} 
                    onClose={() => setIsAwardModalOpen(false)}
                    job={job}
                    installerId={recommendation.professionalId}
                    installerName={recommendation.name || 'Installer Name'}
                    onSuccess={(updatedJob) => {
                        setIsAwardModalOpen(false);
                        onAwarded(updatedJob);
                    }}
                />
            )}
        </Card>
    );
}
