"use client";

import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileText, Trash2 } from 'lucide-react';
import { JobDraft } from '@/lib/api/drafts';
import { toDate } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { useTranslations } from 'next-intl';

interface DraftRecoveryDialogProps {
    open: boolean;
    draft: JobDraft | null;
    onResume: () => void;
    onDiscard: () => void;
    onCancel: () => void;
}

export function DraftRecoveryDialog({
    open,
    draft,
    onResume,
    onDiscard,
    onCancel,
}: DraftRecoveryDialogProps) {
    const tJob = useTranslations('job');
    const tCommon = useTranslations('common');

    if (!draft) return null;

    const timeAgo = formatDistanceToNow(toDate(draft.lastSaved), {
        addSuffix: true,
    });

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        {tJob('draftRecoveryTitle')}
                    </DialogTitle>
                    <DialogDescription>
                        {tJob('draftRecoveryDesc', { timeAgo })}
                    </DialogDescription>
                </DialogHeader>

                {draft.title && (
                    <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                        <div className="text-sm font-medium">{tJob('draftPreview')}</div>
                        <div className="text-sm">
                            <strong>{tJob('title')}:</strong> {draft.title}
                        </div>
                        {draft.jobCategory && (
                            <div className="text-sm">
                                <strong>{tJob('category')}:</strong> {draft.jobCategory}
                            </div>
                        )}
                        {draft.budget && (
                            <div className="text-sm">
                                <strong>{tJob('budget')}:</strong> ₹{draft.budget.min.toLocaleString()} - ₹
                                {draft.budget.max.toLocaleString()}
                            </div>
                        )}
                    </div>
                )}

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onCancel}
                        className="flex-1"
                    >
                        {tCommon('cancel')}
                    </Button>
                    <Button
                        type="button"
                        variant="destructive"
                        onClick={onDiscard}
                        className="flex-1"
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {tJob('discard')}
                    </Button>
                    <Button
                        type="button"
                        onClick={onResume}
                        className="flex-1"
                    >
                        <FileText className="mr-2 h-4 w-4" />
                        {tJob('resumeDraft')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
