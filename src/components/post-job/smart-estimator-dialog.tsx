"use client";

import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Sparkles, Check, AlertTriangle, Info } from "lucide-react";
import { generatePriceEstimateAction } from "@/app/actions/ai.actions";
import { type GeneratePriceEstimateOutput } from "@/domains/ai/ai.types";
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from 'next-intl';

interface SmartEstimatorDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    jobDetails: {
        title: string;
        description: string;
        category: string;
    };
    onApply: (min: number, max: number) => void;
}

export function SmartEstimatorDialog({
    open,
    onOpenChange,
    jobDetails,
    onApply
}: SmartEstimatorDialogProps) {
    const tJob = useTranslations('job');
    const tCommon = useTranslations('common');
    const tError = useTranslations('errors');
    const tSuccess = useTranslations('success');
    const { toast } = useToast();

    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<GeneratePriceEstimateOutput | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Auto-generate on open if not already generated
    React.useEffect(() => {
        if (open && !result && !loading && !error) {
            handleGenerate();
        }
    }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleGenerate = async () => {
        if (!jobDetails.title || !jobDetails.category || jobDetails.description.length < 20) {
            setError(tError('moreDetailsRequiredDesc'));
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const result = await generatePriceEstimateAction({
                jobTitle: jobDetails.title,
                jobDescription: jobDetails.description,
                jobCategory: jobDetails.category
            });
            if (result.success && result.data) {
                setResult(result.data);
            } else {
                throw new Error(result.error);
            }
        } catch (err: any) {
            console.error(err);
            setError(tError(err.message) || tError('estimationFailedDesc'));
        } finally {
            setLoading(false);
        }
    };

    const handleApply = () => {
        if (result) {
            onApply(result.priceEstimate.min, result.priceEstimate.max);
            onOpenChange(false);
            toast({
                title: tJob('budgetApplied'),
                description: tJob('budgetAppliedDesc', { name: `${result.priceEstimate.min} - ₹${result.priceEstimate.max}` })
            });
        }
    };

    const getConfidenceColor = (conf: 'high' | 'medium' | 'low') => {
        switch (conf) {
            case 'high': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
            case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
            case 'low': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
        }
    };

    const getConfidenceLabel = (conf: 'high' | 'medium' | 'low') => {
        switch (conf) {
            case 'high': return tJob('highConfidence');
            case 'medium': return tJob('mediumConfidence');
            case 'low': return tJob('lowConfidence');
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-amber-500" />
                        {tJob('aiBudgetTitle')}
                    </DialogTitle>
                    <DialogDescription>
                        {tJob('aiBudgetDesc')}
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4" aria-live="polite">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <p className="text-sm text-muted-foreground animate-pulse">
                                {tJob('analyzingComplexity')}
                            </p>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center py-6 text-center space-y-2 text-destructive">
                            <AlertTriangle className="h-8 w-8" />
                            <p>{error}</p>
                            <Button variant="outline" size="sm" onClick={handleGenerate}>{tCommon('tryAgain')}</Button>
                        </div>
                    ) : result ? (
                        <div className="space-y-6">
                            {/* Price Range Card */}
                            <div className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm text-center">
                                <div className="text-sm font-medium text-muted-foreground">{tJob('estimatedRange')}</div>
                                <div className="text-3xl font-bold text-primary mt-1">
                                    ₹{result.priceEstimate.min.toLocaleString()} - ₹{result.priceEstimate.max.toLocaleString()}
                                </div>
                                <div className="mt-2 flex justify-center">
                                    <Badge variant="secondary" className={getConfidenceColor(result.confidence)}>
                                        {tJob('confidenceLevel', { level: getConfidenceLabel(result.confidence) })}
                                    </Badge>
                                </div>
                            </div>

                            {/* Reasoning */}
                            <div className="space-y-2">
                                <h4 className="text-sm font-semibold flex items-center gap-2">
                                    <Info className="h-4 w-4" /> {tJob('whyThisPrice')}
                                </h4>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    {result.reasoning}
                                </p>
                            </div>

                            {/* Factors */}
                            {result.factors && result.factors.length > 0 && (
                                <div className="space-y-2">
                                    <h4 className="text-sm font-semibold">{tJob('costFactors')}</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {result.factors.map((factor, i) => (
                                            <Badge key={i} variant="outline" className="bg-muted/50">
                                                {factor}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : null}
                </div>

                <DialogFooter className="sm:justify-between">
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>{tCommon('cancel')}</Button>
                    <Button onClick={handleApply} disabled={!result || loading} className="gap-2">
                        <Check className="h-4 w-4" />
                        {tJob('applyEstimate')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
