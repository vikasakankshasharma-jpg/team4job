'use client';

import React, { useState } from 'react';
import { Job } from '@/lib/types';
import { awardInstallerAction } from '@/app/actions/dealer.actions';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    job: Job;
    installerId: string;
    installerName: string;
    onSuccess: (updatedJob: Job) => void;
}

export default function AwardConfirmationModal({ isOpen, onClose, job, installerId, installerName, onSuccess }: Props) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const idempotencyKeyRef = useRef<string>('');

    React.useEffect(() => {
        if (isOpen) {
            idempotencyKeyRef.current = `award_${job.id}_${installerId}_${crypto.randomUUID()}`;
        }
    }, [isOpen, job.id, installerId]);

    const handleAward = async () => {
        setIsLoading(true);
        setError(null);
        
        try {
            const res = await awardInstallerAction(job.id, installerId, idempotencyKeyRef.current);
            if (res.success) {
                onSuccess({ ...job, status: 'awarded', awardedProfessionalId: installerId });
            } else {
                setError(res.error || 'Failed to award job');
            }
        } catch (e: any) {
            setError(e.message || 'An unexpected error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-xl">Award Job</DialogTitle>
                    <DialogDescription>
                        Review the operational details before confirming the award.
                    </DialogDescription>
                </DialogHeader>
                
                <div className="py-4 space-y-4">
                    <div className="bg-muted/30 p-4 rounded-lg space-y-3">
                        <div className="flex justify-between border-b pb-2">
                            <span className="text-muted-foreground">Installer</span>
                            <span className="font-semibold">{installerName}</span>
                        </div>
                        <div className="flex justify-between border-b pb-2">
                            <span className="text-muted-foreground">Job</span>
                            <span className="font-medium">{job.title || job.jobCategory}</span>
                        </div>
                        {job.deadline && (
                            <div className="flex justify-between border-b pb-2">
                                <span className="text-muted-foreground">Deadline</span>
                                <span className="font-medium">
                                    {new Date((job.deadline as any)._seconds ? (job.deadline as any)._seconds * 1000 : job.deadline).toLocaleDateString()}
                                </span>
                            </div>
                        )}
                    </div>

                    <Alert variant="default" className="bg-amber-50 border-amber-200">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <AlertDescription className="text-amber-800 ml-2">
                            Once awarded, installer contact and exact service location will become available according to job policy.
                        </AlertDescription>
                    </Alert>
                </div>
                
                {error && (
                    <div className="text-sm text-red-500 mb-4">{error}</div>
                )}
                
                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={onClose} disabled={isLoading}>
                        Cancel
                    </Button>
                    <Button onClick={handleAward} disabled={isLoading} className="bg-primary text-primary-foreground">
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Confirm Award
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
