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
import { useTranslations } from 'next-intl';

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
    const tJob = useTranslations('job');
    const tCommon = useTranslations('common');
    const tSuccess = useTranslations('success');
    const tError = useTranslations('errors');

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
                title: tSuccess('templateSaved'),
                description: tSuccess('templateSavedDesc', { name: templateName.trim() }),
            });

            setTemplateName('');
            onOpenChange(false);
        } catch (error) {
            console.error('Error saving template:', error);
            toast({
                title: tError('saveFailed'), // Added to errors namespace previously in my head, checking...
                description: tError('generic'),
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
                        {tJob('saveAsTemplate')}
                    </DialogTitle>
                    <DialogDescription>
                        {tJob('saveTemplateDesc')}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="template-name">{tJob('templateName')}</Label>
                        <Input
                            id="template-name"
                            placeholder={tJob('templateNamePlaceholder')}
                            value={templateName}
                            onChange={(e) => setTemplateName(e.target.value)}
                            disabled={saving}
                        />
                        <p className="text-xs text-muted-foreground">
                            {tJob('templateNameDesc')}
                        </p>
                    </div>

                    <div className="rounded-lg border bg-muted/50 p-3 space-y-1 text-sm">
                        <div className="font-medium">{tJob('whatIsSaved')}</div>
                        <ul className="list-disc list-inside text-muted-foreground space-y-1">
                            <li>{tJob('savedItemTitleDesc')}</li>
                            <li>{tJob('savedItemCatSkills')}</li>
                            <li>{tJob('savedItemBudget')}</li>
                            <li>{tJob('savedItemTip')}</li>
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
                        {tCommon('cancel')}
                    </Button>
                    <Button
                        type="button"
                        onClick={handleSave}
                        disabled={!templateName.trim() || saving}
                    >
                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {tJob('saveAsTemplate')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
