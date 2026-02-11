'use client';

import { Job } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

interface DualLanguageDescriptionProps {
    job: Job;
}

function getLanguageLabel(lang: string): string {
    const labels: Record<string, string> = {
        en: 'English',
        hi: 'Hindi',
        hinglish: 'Hinglish',
    };
    return labels[lang] || lang;
}

export function DualLanguageDescription({ job }: DualLanguageDescriptionProps) {
    const hasOriginal = job.description_original;
    const isNonEnglish = hasOriginal && hasOriginal.language !== 'en';
    const hasCompiledEnglish = job.description_compiled_en;

    // If no language metadata (old jobs), just show description as-is
    if (!hasOriginal) {
        return (
            <div>
                <p className="text-sm whitespace-pre-wrap">{job.description}</p>
            </div>
        );
    }

    // If English original, just show it once
    if (!isNonEnglish || !hasCompiledEnglish) {
        return (
            <div>
                <p className="text-sm whitespace-pre-wrap">{hasOriginal.text}</p>
            </div>
        );
    }

    // Dual-language view: show both original + compiled English
    return (
        <Card className="p-4 space-y-4">
            <section>
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                    Job Description (User Provided – {getLanguageLabel(hasOriginal.language)})
                </Label>
                <p className="text-sm mt-2 whitespace-pre-wrap text-muted-foreground italic">
                    {hasOriginal.text}
                </p>
            </section>

            <Separator />

            <section>
                <Label className="text-xs font-semibold uppercase tracking-wide">
                    Job Description (System Compiled – English)
                </Label>
                <p className="text-sm mt-2 whitespace-pre-wrap">{job.description_compiled_en}</p>
            </section>

            <p className="text-xs text-muted-foreground mt-4">
                ℹ️ Both versions are shown to prevent miscommunication.
                The English version is the system-compiled interpretation.
            </p>
        </Card>
    );
}
