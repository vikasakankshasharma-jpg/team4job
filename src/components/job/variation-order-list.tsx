import React from 'react';
import { Job, AdditionalTask, User } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, XCircle, FileText, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface VariationOrderListProps {
    job: Job;
    user: User;
    isJobGiver: boolean;
    onJobUpdate: (updatedJob: Partial<Job>) => Promise<void>;
    onPayForTask: (task: AdditionalTask) => void;
    onQuoteTask: (task: AdditionalTask) => void;
    onDeclineTask: (task: AdditionalTask) => void;
}

export function VariationOrderList({ job, user, isJobGiver, onJobUpdate, onPayForTask, onQuoteTask, onDeclineTask }: VariationOrderListProps) {
    const tasks = job.additionalTasks || [];

    if (tasks.length === 0) {
        return (
            <div className="text-center p-6 bg-muted/20 rounded-md border border-dashed">
                <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No variation orders (extra work) requested yet.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {tasks.map((task, index) => (
                <Card key={task.id || index} className="overflow-hidden border-l-4 border-l-blue-500">
                    <CardHeader className="pb-2 bg-muted/10">
                        <div className="flex justify-between items-start">
                            <div className="space-y-1">
                                <CardTitle className="text-base font-semibold flex items-center gap-2">
                                    {task.description}
                                </CardTitle>
                                <p className="text-xs text-muted-foreground">
                                    Full ID: {task.id.substring(0, 8)}... • Created by {task.createdBy} • {format(task.createdAt ? (task.createdAt as any).toDate() : new Date(), 'MMM d, yyyy')}
                                </p>
                            </div>
                            <Badge variant={
                                task.status === 'funded' ? 'default' : // default is usually primary/black
                                    task.status === 'approved' ? 'outline' : // approved but maybe not funded? 
                                        task.status === 'declined' ? 'destructive' :
                                            'secondary' // pending-quote / quoted
                            } className={cn(
                                task.status === 'funded' && "bg-green-600 hover:bg-green-700",
                                task.status === 'quoted' && "bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-200"
                            )}>
                                {task.status.replace('-', ' ').toUpperCase()}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="py-4">
                        <div className="flex justify-between items-center">
                            <div>
                                {task.quoteAmount ? (
                                    <div className="text-lg font-bold">
                                        ₹{task.quoteAmount.toLocaleString()}
                                    </div>
                                ) : (
                                    <span className="text-sm italic text-muted-foreground">Price TBD</span>
                                )}
                                {task.quoteDetails && (
                                    <p className="text-xs text-muted-foreground mt-1">{task.quoteDetails}</p>
                                )}
                            </div>
                        </div>
                    </CardContent>

                    {/* Actions Row */}
                    {(task.status !== 'funded' && task.status !== 'declined') && (
                        <CardFooter className="bg-muted/10 py-3 flex justify-end gap-2">

                            {/* Scenario 1: Pending Quote (User requested, needs Installer Quote) */}
                            {task.status === 'pending-quote' && !isJobGiver && (
                                <Button size="sm" onClick={() => onQuoteTask(task)}>
                                    Submit Quote
                                </Button>
                            )}

                            {/* Scenario 2: Quoted (Installer proposed/quoted, needs User Approval) */}
                            {task.status === 'quoted' && isJobGiver && (
                                <>
                                    <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => onDeclineTask(task)}>
                                        <XCircle className="h-4 w-4 mr-1" />
                                        Decline
                                    </Button>
                                    <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => onPayForTask(task)}>
                                        <CheckCircle2 className="h-4 w-4 mr-1" />
                                        Approve & Pay
                                    </Button>
                                </>
                            )}

                            {/* Scenario 3: Waiting (User waiting for quote) */}
                            {task.status === 'pending-quote' && isJobGiver && (
                                <span className="text-xs text-muted-foreground italic">Waiting for Installer's Quote...</span>
                            )}
                            {/* Scenario 4: Waiting (Installer waiting for approval) */}
                            {task.status === 'quoted' && !isJobGiver && (
                                <span className="text-xs text-muted-foreground italic">Waiting for Job Giver to Approve...</span>
                            )}

                        </CardFooter>
                    )}
                </Card>
            ))}
        </div>
    );
}
