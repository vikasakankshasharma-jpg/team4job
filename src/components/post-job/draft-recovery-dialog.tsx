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
                        Resume your draft?
                    </DialogTitle>
                    <DialogDescription>
                        You have an unsaved job post from <strong>{timeAgo}</strong>.
                    </DialogDescription>
                </DialogHeader>

                {draft.title && (
                    <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                        <div className="text-sm font-medium">Draft Preview:</div>
                        <div className="text-sm">
                            <strong>Title:</strong> {draft.title}
                        </div>
                        {draft.jobCategory && (
                            <div className="text-sm">
                                <strong>Category:</strong> {draft.jobCategory}
                            </div>
                        )}
                        {draft.budget && (
                            <div className="text-sm">
                                <strong>Budget:</strong> ₹{draft.budget.min.toLocaleString()} - ₹
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
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        variant="destructive"
                        onClick={onDiscard}
                        className="flex-1"
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Discard
                    </Button>
                    <Button
                        type="button"
                        onClick={onResume}
                        className="flex-1"
                    >
                        <FileText className="mr-2 h-4 w-4" />
                        Resume Draft
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
