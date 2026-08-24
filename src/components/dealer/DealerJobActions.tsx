'use client';

import React, { useState } from 'react';
import { Job } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { submitForMatchingAction, cancelDealerJobAction } from '@/app/actions/dealer.actions';
import { Loader2, Play, XCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Props {
    job: Job;
    onUpdate: (updatedJob: Job) => void;
}

export default function DealerJobActions({ job, onUpdate }: Props) {
    const [isLoading, setIsLoading] = useState(false);
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const submitKeyRef = React.useRef<string>('');
    const cancelKeyRef = React.useRef<string>('');

    React.useEffect(() => {
        if (!submitKeyRef.current) submitKeyRef.current = `submit_${job.id}_${crypto.randomUUID()}`;
    }, [job.id]);

    React.useEffect(() => {
        if (isCancelModalOpen) cancelKeyRef.current = `cancel_${job.id}_${crypto.randomUUID()}`;
    }, [isCancelModalOpen, job.id]);

    const handleSubmitForMatching = async () => {
        setIsLoading(true);
        try {
            const res = await submitForMatchingAction(job.id, submitKeyRef.current);
            if (res.success) {
                onUpdate({ ...job, status: 'open' });
            } else {
                alert(res.error || 'Failed to submit job');
            }
        } catch (e: any) {
            alert(e.message || 'Error submitting job');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancelJob = async () => {
        setIsLoading(true);
        try {
            const res = await cancelDealerJobAction(job.id, 'Dealer cancelled', cancelKeyRef.current);
            if (res.success) {
                onUpdate({ ...job, status: 'cancelled' });
                setIsCancelModalOpen(false);
            } else {
                alert(res.error || 'Failed to cancel job');
            }
        } catch (e: any) {
            alert(e.message || 'Error cancelling job');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center space-x-2">
            {job.status === 'draft' && (
                <Button onClick={handleSubmitForMatching} disabled={isLoading}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                    Submit for Matching
                </Button>
            )}

            {(job.status === 'draft' || job.status === 'open' || job.status === 'reviewing') && (
                <Button variant="destructive" onClick={() => setIsCancelModalOpen(true)} disabled={isLoading}>
                    <XCircle className="mr-2 h-4 w-4" /> Cancel Job
                </Button>
            )}
            
            <Dialog open={isCancelModalOpen} onOpenChange={(open) => !open && setIsCancelModalOpen(false)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Cancel Job?</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to cancel this job? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCancelModalOpen(false)} disabled={isLoading}>
                            Keep Job
                        </Button>
                        <Button variant="destructive" onClick={handleCancelJob} disabled={isLoading}>
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Confirm Cancel
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
