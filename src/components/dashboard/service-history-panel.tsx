import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getJobServiceHistoryAction, ServiceHistoryItem } from '@/app/actions/job.actions';
import { History, AlertTriangle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

export function ServiceHistoryPanel({ jobId }: { jobId: string }) {
    const [history, setHistory] = useState<ServiceHistoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;
        async function fetchHistory() {
            setLoading(true);
            try {
                const res = await getJobServiceHistoryAction(jobId);
                if (mounted) {
                    if (res.success) {
                        setHistory(res.data || []);
                    } else {
                        setError('Failed to load service history. Please try again later.');
                    }
                }
            } catch (e) {
                if (mounted) setError('An error occurred while fetching service history.');
            } finally {
                if (mounted) setLoading(false);
            }
        }
        fetchHistory();
        return () => { mounted = false; };
    }, [jobId]);

    if (loading) {
        return (
            <Card className="w-full bg-card/40 backdrop-blur-sm border-primary/10">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <History className="h-5 w-5 text-muted-foreground" />
                        Service History
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex justify-center py-6">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card className="w-full bg-card/40 backdrop-blur-sm border-primary/10">
                <CardContent className="py-6 text-center text-sm text-muted-foreground">
                    {error}
                </CardContent>
            </Card>
        );
    }

    if (history.length === 0) {
        return (
            <Card className="w-full bg-card/40 backdrop-blur-sm border-primary/10">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <History className="h-5 w-5 text-muted-foreground" />
                        Service History
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground text-center py-4">No previous service history found for this location.</p>
                </CardContent>
            </Card>
        );
    }

    const activeJobs = history.filter(h => h.status !== 'completed' && h.status !== 'Completed');

    return (
        <Card className="w-full bg-card/40 backdrop-blur-sm border-primary/10">
            <CardHeader>
                <CardTitle className="flex items-center justify-between text-lg">
                    <div className="flex items-center gap-2">
                        <History className="h-5 w-5 text-muted-foreground" />
                        <span>Service History</span>
                    </div>
                    <Badge variant="secondary" className="font-normal text-xs">{history.length} previous services</Badge>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {activeJobs.length > 0 && (
                    <div className="flex items-center gap-3 bg-amber-500/10 text-amber-500 p-3 rounded-md text-sm border border-amber-500/20">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        <p>Another service job is currently in progress at this location.</p>
                    </div>
                )}
                <div className="space-y-4">
                    {history.map(item => (
                        <div key={item.jobId} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg border bg-background/50 hover:bg-background transition-colors">
                            <div>
                                <h4 className="font-medium text-sm">{item.title}</h4>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                    <span>{format(new Date(item.date), 'MMM d, yyyy')}</span>
                                    <span>�</span>
                                    <span>{item.category}</span>
                                    {item.installerName && (
                                        <>
                                            <span>�</span>
                                            <span>By {item.installerName}</span>
                                        </>
                                    )}
                                </div>
                            </div>
                            <div>
                                <Badge variant={item.status.toLowerCase() === 'completed' ? 'default' : 'outline'} className="text-[10px] uppercase">
                                    {item.status}
                                </Badge>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
