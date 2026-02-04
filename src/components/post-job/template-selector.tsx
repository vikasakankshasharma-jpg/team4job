"use client";

import React, { useEffect, useState } from 'react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Settings, FileText, Sparkles } from 'lucide-react';
import { JobTemplate, getTemplates } from '@/lib/api/drafts';
import { useFirebase, useUser } from '@/hooks/use-user';
import { Skeleton } from '@/components/ui/skeleton';

interface TemplateSelectorProps {
    onTemplateSelect: (template: JobTemplate) => void;
    onManageTemplates: () => void;
    disabled?: boolean;
}

export function TemplateSelector({
    onTemplateSelect,
    onManageTemplates,
    disabled = false,
}: TemplateSelectorProps) {
    const { user } = useUser();
    const { db } = useFirebase();
    const [templates, setTemplates] = useState<JobTemplate[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadTemplates() {
            if (!user || !db) return;

            try {
                const userTemplates = await getTemplates(db, user.id);
                setTemplates(userTemplates);
            } catch (error) {
                console.error('Error loading templates:', error);
            } finally {
                setLoading(false);
            }
        }

        loadTemplates();
    }, [user, db]);

    const handleValueChange = (value: string) => {
        if (value === 'manage') {
            onManageTemplates();
            return;
        }

        const selectedTemplate = templates.find((t) => t.id === value);
        if (selectedTemplate) {
            onTemplateSelect(selectedTemplate);
        }
    };

    if (loading) {
        return <Skeleton className="h-10 w-full" />;
    }

    if (templates.length === 0) {
        return (
            <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                <FileText className="mx-auto h-8 w-8 mb-2 opacity-50" />
                <p>No templates yet</p>
                <p className="text-xs mt-1">
                    Save this job as a template to reuse later
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Quick Start from Template
            </label>
            <Select onValueChange={handleValueChange} disabled={disabled}>
                <SelectTrigger aria-label="Load a job template">
                    <SelectValue placeholder="Load from template..." />
                </SelectTrigger>
                <SelectContent>
                    {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                            <div className="flex items-center justify-between gap-4 w-full">
                                <span className="font-medium">{template.name}</span>
                                <div className="flex items-center gap-2">
                                    <Badge variant="secondary" className="text-xs">
                                        {template.category}
                                    </Badge>
                                    {template.useCount > 0 && (
                                        <span className="text-xs text-muted-foreground">
                                            Used {template.useCount}×
                                        </span>
                                    )}
                                </div>
                            </div>
                        </SelectItem>
                    ))}
                    <Separator className="my-2" />
                    <SelectItem value="manage">
                        <div className="flex items-center gap-2 text-primary">
                            <Settings className="w-4 h-4" />
                            Manage Templates
                        </div>
                    </SelectItem>
                </SelectContent>
            </Select>
        </div>
    );
}
