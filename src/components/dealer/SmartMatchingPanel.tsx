'use client';

import React, { useEffect, useState } from 'react';
import { Job } from '@/lib/types';
import { getRecommendedInstallersAction } from '@/app/actions/dealer.actions';
import { Loader2, RefreshCw, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import InstallerRecommendationCard from './InstallerRecommendationCard';

interface Props {
    job: Job;
    onAwarded: (updatedJob: Job) => void;
}

export default function SmartMatchingPanel({ job, onAwarded }: Props) {
    const [recommendations, setRecommendations] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadRecommendations = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await getRecommendedInstallersAction(job.id);
            if (res.success && res.data) {
                setRecommendations(res.data);
            } else {
                setError(res.error || 'Failed to load recommendations');
            }
        } catch (e: any) {
            setError(e.message || 'An unexpected error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (job.status === 'open' || job.status === 'reviewing') {
            loadRecommendations();
        } else {
            setIsLoading(false);
        }
    }, [job.id, job.status]);

    if (job.status === 'draft') {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-muted/20 border border-dashed rounded-lg">
                <Info className="h-8 w-8 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">Job is in Draft</h3>
                <p className="text-sm text-muted-foreground mt-1">Submit the job for matching to see recommended installers.</p>
            </div>
        );
    }

    if (job.status === 'awarded' || job.status === 'in_progress' || job.status === 'completed' || job.status === 'closed') {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-muted/20 border border-dashed rounded-lg">
                <Info className="h-8 w-8 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">Job Already Awarded</h3>
                <p className="text-sm text-muted-foreground mt-1">
                    This job has been awarded to an installer. Smart matching is disabled.
                </p>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-sm text-muted-foreground">Running Smart Matching Engine...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-red-50 text-red-800 rounded-lg">
                <p className="mb-4">{error}</p>
                <Button variant="outline" onClick={loadRecommendations}>Retry</Button>
            </div>
        );
    }

    if (recommendations.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-muted/20 border rounded-lg">
                <h3 className="text-lg font-medium">No Matches Found</h3>
                <p className="text-sm text-muted-foreground mt-1">We couldn't find any eligible installers in this area right now.</p>
                <Button variant="outline" className="mt-4" onClick={loadRecommendations}>
                    <RefreshCw className="mr-2 h-4 w-4" /> Refresh
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                    Found {recommendations.length} recommended installers based on skills, location, and reputation.
                </p>
                <Button variant="outline" size="sm" onClick={loadRecommendations}>
                    <RefreshCw className="mr-2 h-4 w-4" /> Refresh
                </Button>
            </div>
            
            <div className="grid grid-cols-1 gap-6">
                {recommendations.map((rec) => (
                    <InstallerRecommendationCard 
                        key={rec.professionalId} 
                        job={job} 
                        recommendation={rec} 
                        onAwarded={onAwarded}
                    />
                ))}
            </div>
        </div>
    );
}
