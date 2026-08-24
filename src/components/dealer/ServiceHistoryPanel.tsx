'use client';

import React, { useEffect, useState } from 'react';
import { getJobServiceHistoryAction, ServiceHistoryItem } from '@/app/actions/job.actions';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, History, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

interface Props {
    jobId: string;
    serviceLocationId?: string;
}

export default function ServiceHistoryPanel({ jobId, serviceLocationId }: Props) {
    const [history, setHistory] = useState<ServiceHistoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadHistory = async () => {
            if (!serviceLocationId) {
                setIsLoading(false);
                return;
            }
            
            try {
                const res = await getJobServiceHistoryAction(jobId);
                if (res.success && res.data) {
                    setHistory(res.data);
                } else {
                    setError(res.error || 'Failed to load history');
                }
            } catch (e: any) {
                setError(e.message || 'An unexpected error occurred');
            } finally {
                setIsLoading(false);
            }
        };
        
        loadHistory();
    }, [jobId, serviceLocationId]);

    if (!serviceLocationId) {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-muted/20 border border-dashed rounded-lg">
                <History className="h-8 w-8 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No History Available</h3>
                <p className="text-sm text-muted-foreground mt-1">This job is not linked to a specific Service Site.</p>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="flex justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-red-50 text-red-800 rounded-lg">
                <AlertCircle className="h-8 w-8 mb-4" />
                <p>{error}</p>
            </div>
        );
    }

    if (history.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-muted/20 border rounded-lg">
                <History className="h-8 w-8 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No Previous Jobs</h3>
                <p className="text-sm text-muted-foreground mt-1">This is the first job created for this service site.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {history.map((item) => (
                <Card key={item.jobId} className={item.jobId === jobId ? "border-primary bg-primary/5" : ""}>
                    <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between">
                        <div>
                            <div className="flex items-center space-x-2">
                                <h4 className="font-semibold">{item.title}</h4>
                                {item.jobId === jobId && (
                                    <Badge variant="default" className="text-[10px] uppercase">Current Job</Badge>
                                )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                                {format(new Date(item.date), 'PPP')} • {item.category}
                            </p>
                            {item.installerName && (
                                <p className="text-sm mt-1">
                                    <span className="font-medium text-muted-foreground">Installer: </span> 
                                    {item.installerName}
                                </p>
                            )}
                        </div>
                        <div className="mt-4 md:mt-0 text-left md:text-right">
                            <Badge variant={item.status === 'completed' ? 'default' : 'secondary'} className="capitalize">
                                {item.status.replace('_', ' ')}
                            </Badge>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
