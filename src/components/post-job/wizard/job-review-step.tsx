
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
import { Loader2, Sparkles, AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react";
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
        <div className="w-full max-w-4xl mx-auto p-4 space-y-10">
            <div className="text-center space-y-3">
                <h2 className="text-3xl font-extrabold tracking-tight">{tJob('reviewTitle')}</h2>
                <p className="text-muted-foreground text-lg font-medium opacity-80">
                    {tJob('reviewDesc')}
                </p>
            </div>

            <div className="grid gap-8 lg:grid-cols-12">
                <div className="lg:col-span-8 space-y-8">
                    <Card className={`p-8 border-0 shadow-2xl transition-all duration-700 relative overflow-hidden bg-card ${justUpdated ? "ring-2 ring-success shadow-success/20 scale-[1.01]" : ""}`}>
                        {/* Elegant Corner Accent */}
                        <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-primary/5 to-transparent transition-opacity duration-700 ${justUpdated ? 'opacity-100' : 'opacity-0'}`} />
                        
                        {justUpdated && (
                            <div className="absolute top-6 right-6 text-success flex items-center text-xs font-bold uppercase tracking-widest animate-in fade-in slide-in-from-right-4 duration-500">
                                <CheckCircle2 className="w-4 h-4 mr-2" /> {tJob('updated')}
                            </div>
                        )}
 
                        <div className="space-y-8 relative">
                            <div>
                                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground opacity-70 mb-3 block">{tJob('title') || 'Job Title'}</Label>
                                <div className="text-2xl font-extrabold tracking-tight text-foreground">
                                    {data.jobTitle}
                                </div>
                            </div>
 
                            <div className="bg-muted/5 p-6 rounded-2xl border border-muted-foreground/10">
                                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground opacity-70 mb-4 block">{tJob('description') || 'Job description'}</Label>
                                <div className="space-y-4 text-foreground/90 text-base leading-relaxed font-medium">
                                    {(data.jobDescription || "").split('\n').map((line, i) => {
                                        const trimmed = line.trim();
                                        if (!trimmed) return <div key={i} className="h-2" />;
                                        if (trimmed.startsWith('-') || trimmed.startsWith('•')) {
                                            return (
                                                <div key={i} className="flex gap-3 group">
                                                    <div className="mt-2 h-1.5 w-1.5 rounded-full bg-primary/40 shrink-0 group-hover:bg-primary transition-colors" />
                                                    <span>{trimmed.replace(/^[-•]\s*/, '').trim()}</span>
                                                </div>
                                            );
                                        }
                                        return <p key={i} className="mb-4">{trimmed}</p>;
                                    })}
                                </div>
                            </div>
                        </div>
                    </Card>
 
                    <Card className="p-8 border-2 border-dashed border-muted-foreground/20 bg-muted/5 shadow-sm hover:border-primary/30 transition-all duration-300">
                        <Label className="mb-4 block text-sm font-bold uppercase tracking-widest text-muted-foreground opacity-70">
                            {tJob('editPrompt')}
                        </Label>
                        <div className="flex gap-3">
                            <Textarea
                                placeholder={tJob('editPlaceholder')}
                                value={userEdit}
                                onChange={(e) => setUserEdit(e.target.value)}
                                className="bg-background resize-none rounded-xl border-input/50 focus:border-primary transition-all p-4 text-sm font-medium"
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
                                className="h-auto w-28 shrink-0 rounded-xl shadow-lg shadow-primary/20"
                            >
                                {isRecompiling ? (
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                ) : (
                                    <Sparkles className="h-5 w-5 mr-1" />
                                )}
                                <span className={`${isRecompiling ? 'sr-only' : 'font-bold'}`}>{tCommon('update')}</span>
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-4 font-medium opacity-70 flex items-center gap-2">
                            <Sparkles className="h-3 w-3 text-primary" /> {tJob('editDesc')}
                        </p>
                    </Card>
                </div>

                <div className="lg:col-span-4 space-y-6">
                    {data.priceEstimate && (
                        <Card className="p-6 bg-primary/5 border-0 shadow-lg shadow-primary/5 overflow-hidden relative">
                            <div className="absolute top-0 left-0 w-1.5 h-full bg-primary" />
                            <h3 className="font-bold text-xs uppercase tracking-widest text-primary mb-3 opacity-80">{tJob('priceEstimateTitle')}</h3>
                            <div className="text-3xl font-extrabold tracking-tight">
                                ₹{data.priceEstimate.min.toLocaleString()} - ₹{data.priceEstimate.max.toLocaleString()}
                            </div>
                            <p className="text-xs text-muted-foreground mt-4 font-bold opacity-60 flex items-center justify-between">
                                <span>{selectedCategory} Market</span>
                                <CheckCircle2 className="h-3 w-3 text-primary" />
                            </p>
                        </Card>
                    )}
 
                    {summaryItems.length > 0 && (
                        <Card className="p-6 bg-muted/20 border-0 shadow-sm">
                            <h3 className="font-bold text-xs uppercase tracking-widest text-muted-foreground mb-5 opacity-70">{tJob('jobSummary')}</h3>
                            <div className="space-y-4 text-sm">
                                {summaryItems.map(([key, value]) => (
                                    <div key={key} className="flex justify-between items-center group">
                                        <span className="text-muted-foreground capitalize font-medium group-hover:text-foreground transition-colors">{key.replace(/_/g, ' ')}</span>
                                        <div className="h-px bg-muted-foreground/10 flex-grow mx-3 group-hover:bg-primary/20 transition-colors" />
                                        <span className="font-bold text-foreground">{String(value)}</span>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}
 
                    <div className="space-y-4 pt-4">
                        <Button
                            size="lg"
                            className="w-full text-lg font-extrabold shadow-xl shadow-primary/20 h-16 rounded-2xl group transition-all duration-300 hover:scale-[1.02]"
                            onClick={() => onPostJob(data)}
                        >
                            {tJob('looksGood')}
                            <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                        </Button>
                        <Button
                            variant="outline"
                            className="w-full text-sm font-bold h-12 rounded-xl border-input/50 hover:bg-primary/5 transition-all"
                            onClick={() => setShowSaveDialog(true)}
                        >
                            <Sparkles className="mr-2 h-4 w-4 text-primary" /> Save as Template
                        </Button>
                    </div>
                </div>
            </div>

            <AlertDialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Save as Template</AlertDialogTitle>
                        <AlertDialogDescription>
                            Give this configuration a name (e.g. &quot;Office 4-Device Setup&quot; or &quot;Basic Home Wiring&quot;) to reuse it instantly next time.
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
