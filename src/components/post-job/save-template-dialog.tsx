"use client";

import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Bookmark, Loader2 } from 'lucide-react';
import { JobDraft, saveTemplate } from '@/lib/api/drafts';
import { useFirebase, useUser } from '@/hooks/use-user';
import { useToast } from '@/hooks/use-toast';

interface SaveTemplateDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    draftData: Partial<JobDraft>;
    category: string;
}

export function SaveTemplateDialog({
    open,
    onOpenChange,
    draftData,
    category,
}: SaveTemplateDialogProps) {
    const { user } = useUser();
    const { db } = useFirebase();
    const { toast } = useToast();

    const [templateName, setTemplateName] = useState('');
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (!user || !db || !templateName.trim()) {
            return;
        }

        setSaving(true);

        try {
            await saveTemplate(
                db,
                user.id,
                { ...draftData, jobCategory: category } as any,
                templateName.trim()
            );

            toast({
                title: 'Template saved!',
                description: `"${templateName}" is now available for quick use.`,
            });

            setTemplateName('');
            onOpenChange(false);
        } catch (error) {
            console.error('Error saving template:', error);
            toast({
                title: 'Failed to save template',
                description: 'Please try again.',
                variant: 'destructive',
            });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Bookmark className="h-5 w-5 text-primary" />
                        Save as Template
                    </DialogTitle>
                    <DialogDescription>
                        Create a reusable template from this job posting.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="template-name">Template Name</Label>
                        <Input
                            id="template-name"
                            placeholder="e.g., Monthly Office Maintenance"
                            value={templateName}
                            onChange={(e) => setTemplateName(e.target.value)}
                            disabled={saving}
                        />
                        <p className="text-xs text-muted-foreground">
                            Choose a descriptive name to easily identify this template later.
                        </p>
                    </div>

                    <div className="rounded-lg border bg-muted/50 p-3 space-y-1 text-sm">
                        <div className="font-medium">What will be saved:</div>
                        <ul className="list-disc list-inside text-muted-foreground space-y-1">
                            <li>Job title and description</li>
                            <li>Category and skills</li>
                            <li>Budget range</li>
                            <li>Travel tip amount</li>
                        </ul>
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={saving}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        onClick={handleSave}
                        disabled={!templateName.trim() || saving}
                    >
                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Template
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
