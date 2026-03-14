
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Sparkles, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useTranslations } from 'next-intl';

interface CompileOutput {
    jobTitle: string;
    jobDescription: string;
    conflictWarning?: string;
    priceEstimate?: {
        min: number;
        max: number;
        currency: string;
    };
    skills?: string[];
}

interface JobReviewStepProps {
    initialData: CompileOutput;
    rawAnswers: Record<string, any>;
    selectedCategory: string;
    onPostJob: (finalData: CompileOutput & { userEdit?: string }) => void;
    onRecompile: (edit: string, currentDesc: string) => Promise<CompileOutput>;
}

export function JobReviewStep({
    initialData,
    rawAnswers,
    selectedCategory,
    onPostJob,
    onRecompile,
}: JobReviewStepProps) {
    const tJob = useTranslations('job');
    const tCommon = useTranslations('common');
    const [data, setData] = useState<CompileOutput>(initialData);
    const [userEdit, setUserEdit] = useState("");
    const [isRecompiling, setIsRecompiling] = useState(false);
    const [conflict, setConflict] = useState<string | null>(null);

    const [justUpdated, setJustUpdated] = useState(false);
    const [isSavingTemplate, setIsSavingTemplate] = useState(false);
    const [templateName, setTemplateName] = useState("");
    const [showSaveDialog, setShowSaveDialog] = useState(false);

    const handleRecompile = async () => {
        if (!userEdit.trim()) return;
        setIsRecompiling(true);
        setConflict(null);

        try {
            const result = await onRecompile(userEdit, data.jobDescription);
            if (result.conflictWarning) {
                setConflict(result.conflictWarning);
            } else {
                setData(result);
                setUserEdit("");
                setJustUpdated(true);
                setTimeout(() => setJustUpdated(false), 3000);
            }
        } catch (error) {
            // Recompile failed
        } finally {
            setIsRecompiling(false);
        }
    };

    const handleSaveTemplate = async () => {
        if (!templateName.trim()) return;
        setIsSavingTemplate(true);
        try {
            const { savePersonalTemplateAction } = await import('@/app/actions/ai.actions');
            await savePersonalTemplateAction({
                name: templateName,
                description: `Custom template based on: ${data.jobTitle}`,
                category: selectedCategory,
                defaultAnswers: rawAnswers
            });
            setShowSaveDialog(false);
            setTemplateName("");
        } catch (error) {
            // Save template failed
        } finally {
            setIsSavingTemplate(false);
        }
    };

    const handleConflictResolve = (accept: boolean) => {
        setConflict(null);
    };

    const summaryItems = Object.entries(rawAnswers)
        .filter(([key]) => !['urgency', 'editHistory'].includes(key))
        .slice(0, 4);

    return (
        <div className="w-full max-w-3xl mx-auto p-4 space-y-8">
            <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold">{tJob('reviewTitle')}</h2>
                <p className="text-muted-foreground">
                    {tJob('reviewDesc')}
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <div className="md:col-span-2 space-y-6">
                    <Card className={`p-6 border-2 transition-colors duration-500 relative ${justUpdated ? "border-green-500/50 bg-green-50/10" : "border-primary/10"}`}>
                        {justUpdated && (
                            <div className="absolute top-4 right-4 text-green-600 flex items-center text-sm font-medium animate-in fade-in zoom-in duration-300">
                                <CheckCircle2 className="w-4 h-4 mr-1" /> {tJob('updated')}
                            </div>
                        )}

                        <div className="space-y-4">
                            <div>
                                <Label className="text-muted-foreground">{tJob('title')}</Label>
                                <div className="text-xl font-bold">
                                    {data.jobTitle}
                                </div>
                            </div>

                            <div className="bg-muted/30 p-4 rounded-lg">
                                <Label className="text-muted-foreground mb-2 block">{tJob('description')}</Label>
                                <ul className="space-y-2 text-foreground/90 list-disc pl-4">
                                    {data.jobDescription.split('\n').map((line, i) => (
                                        line.trim().startsWith('-')
                                            ? <li key={i}>{line.replace(/^-/, '').trim()}</li>
                                            : <p key={i} className="mb-2">{line}</p>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6 border-dashed border-2 bg-accent/20">
                        <Label className="mb-2 block font-medium">
                            {tJob('editPrompt')}
                        </Label>
                        <div className="flex gap-2">
                            <Textarea
                                placeholder={tJob('editPlaceholder')}
                                value={userEdit}
                                onChange={(e) => setUserEdit(e.target.value)}
                                className="bg-background resize-none"
                                rows={2}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleRecompile();
                                    }
                                }}
                            />
                            <Button
                                onClick={handleRecompile}
                                disabled={!userEdit.trim() || isRecompiling}
                                className="h-auto w-24 shrink-0"
                            >
                                {isRecompiling ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Sparkles className="h-4 w-4" />
                                )}
                                <span className="sr-only">{tCommon('update')}</span>
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                            {tJob('editDesc')}
                        </p>
                    </Card>
                </div>

                <div className="space-y-6">
                    {data.priceEstimate && (
                        <Card className="p-4 bg-primary/5 border-primary/20">
                            <h3 className="font-semibold text-sm text-primary mb-1">{tJob('priceEstimateTitle')}</h3>
                            <div className="text-2xl font-bold">
                                ₹{data.priceEstimate.min.toLocaleString()} - ₹{data.priceEstimate.max.toLocaleString()}
                            </div>
                            <p className="text-xs text-muted-foreground mt-2 text-primary/80 font-medium">
                                {selectedCategory} requirement analysis
                            </p>
                        </Card>
                    )}

                    <Card className="p-4 bg-muted/20">
                        <h3 className="font-semibold text-sm mb-3">{tJob('jobSummary')}</h3>
                        <div className="space-y-2 text-sm">
                            {summaryItems.map(([key, value]) => (
                                <div key={key} className="flex justify-between items-center">
                                    <span className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</span>
                                    <span className="font-medium">{String(value)}</span>
                                </div>
                            ))}
                        </div>
                    </Card>

                    <div className="space-y-3">
                        <Button
                            size="lg"
                            className="w-full text-lg shadow-lg shadow-primary/20 h-14"
                            onClick={() => onPostJob(data)}
                        >
                            {tJob('looksGood')}
                        </Button>
                        <Button
                            variant="outline"
                            className="w-full text-muted-foreground"
                            onClick={() => setShowSaveDialog(true)}
                        >
                            <Sparkles className="mr-2 h-4 w-4" /> Save as Template
                        </Button>
                    </div>
                </div>
            </div>

            <AlertDialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Save as Template</AlertDialogTitle>
                        <AlertDialogDescription>
                            Give this configuration a name (e.g. "Office 4-Device Setup" or "Basic Home Wiring") to reuse it instantly next time.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-2">
                        <Input
                            placeholder="Template Name"
                            value={templateName}
                            onChange={(e) => setTemplateName(e.target.value)}
                        />
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                handleSaveTemplate();
                            }}
                            disabled={!templateName.trim() || isSavingTemplate}
                        >
                            {isSavingTemplate && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Template
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={!!conflict} onOpenChange={(open) => !open && setConflict(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <div className="flex items-center gap-2 text-amber-500 mb-2">
                            <AlertTriangle className="h-6 w-6" />
                            <AlertDialogTitle>{tJob('conflictTitle')}</AlertDialogTitle>
                        </div>
                        <AlertDialogDescription className="text-base text-foreground">
                            {conflict}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogAction onClick={() => handleConflictResolve(false)}>
                            {tJob('editAgain')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
