
"use client";

import { useState, useRef } from "react";
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
import { motion, AnimatePresence } from "framer-motion";
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
    skills?: string[]; // Added skills
}

interface JobReviewStepProps {
    initialData: CompileOutput;
    rawAnswers: Record<string, any>; // For conflict context
    onPostJob: (finalData: CompileOutput & { userEdit?: string }) => void;
    onRecompile: (edit: string, currentDesc: string) => Promise<CompileOutput>;
}

export function JobReviewStep({
    initialData,
    rawAnswers,
    onPostJob,
    onRecompile,
}: JobReviewStepProps) {
    const tJob = useTranslations('job');
    const tCommon = useTranslations('common');
    const [data, setData] = useState<CompileOutput>(initialData);
    const [userEdit, setUserEdit] = useState("");
    const [isRecompiling, setIsRecompiling] = useState(false);
    const [conflict, setConflict] = useState<string | null>(null);

    // Track if we just had a successful recompile to show a subtle success state
    const [justUpdated, setJustUpdated] = useState(false);

    const handleRecompile = async () => {
        if (!userEdit.trim()) return;

        setIsRecompiling(true);
        setConflict(null); // specific conflict state for dialog

        try {
            const result = await onRecompile(userEdit, data.jobDescription);

            if (result.conflictWarning) {
                setConflict(result.conflictWarning);
                // Do NOT update data yet
            } else {
                setData(result);
                setUserEdit(""); // Clear edit box on success
                setJustUpdated(true);
                setTimeout(() => setJustUpdated(false), 3000);
            }
        } catch (error) {
            console.error("Recompile failed", error);
            // Ideally show toast error
        } finally {
            setIsRecompiling(false);
        }
    };

    const handleConflictResolve = (accept: boolean) => {
        setConflict(null);
        if (accept) {
            // In a real app, we might force the update or navigate back.
            // For this flow, "Accept" means "I understand, please update anyway" 
            // OR specifically as requested: "Aapne pehle X select kiya tha... Kya update kar dein?"
            // If user says YES (Update), we might need to re-trigger compilation WITH a flag to ignore conflict,
            // OR just expect the user to change their edit text.
            // For Phase 1 simplified: We just let them edit again.
        }
    };

    return (
        <div className="w-full max-w-3xl mx-auto p-4 space-y-8">

            <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold">{tJob('reviewTitle')}</h2>
                <p className="text-muted-foreground">
                    {tJob('reviewDesc')}
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                {/* Main Content (Title/Desc) */}
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
                                <div className="text-xl font-bold flex items-center gap-2">
                                    {data.jobTitle}
                                </div>
                            </div>

                            <div className="bg-muted/30 p-4 rounded-lg">
                                <Label className="text-muted-foreground mb-2 block">{tJob('description')}</Label>
                                <ul className="space-y-2 text-foreground/90 list-disc pl-4">
                                    {/* Render raw text lines or improved formatter later */}
                                    {data.jobDescription.split('\n').map((line, i) => (
                                        line.trim().startsWith('-')
                                            ? <li key={i}>{line.replace(/^-/, '').trim()}</li>
                                            : <p key={i} className="mb-2">{line}</p>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </Card>

                    {/* Edit Box */}
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

                {/* Sidebar (Price & Status) */}
                <div className="space-y-6">
                    {data.priceEstimate && (
                        <Card className="p-4 bg-primary/5 border-primary/20">
                            <h3 className="font-semibold text-sm text-primary mb-1">{tJob('priceEstimateTitle')}</h3>
                            <div className="text-2xl font-bold">
                                ₹{data.priceEstimate.min.toLocaleString()} - ₹{data.priceEstimate.max.toLocaleString()}
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                                {tJob('priceEstimateSub', { count: rawAnswers.camera_count, area: rawAnswers.camera_area })}
                            </p>
                        </Card>
                    )}

                    <Card className="p-4">
                        <h3 className="font-semibold text-sm mb-3">{tJob('jobSummary')}</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">{tCommon('type')}</span>
                                <span className="font-medium">{rawAnswers.location_type}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">{tJob('cameras')}</span>
                                <span className="font-medium">{rawAnswers.camera_count}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">{tJob('wiring')}</span>
                                <span className="font-medium">{rawAnswers.wiring_status}</span>
                            </div>
                        </div>
                    </Card>

                    <Button
                        size="lg"
                        className="w-full text-lg shadow-lg shadow-primary/20"
                        onClick={() => onPostJob(data)}
                    >
                        {tJob('looksGood')}
                    </Button>
                </div>
            </div>

            {/* Conflict Dialog */}
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
                        <AlertDialogCancel onClick={() => handleConflictResolve(false)}>
                            {tJob('editAgain')}
                        </AlertDialogCancel>
                        {/* 
                In a rigorous implementation, 'Confirmed Update' would force-override the conflict logic.
                Here we just guide them to edit.
            */}
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
