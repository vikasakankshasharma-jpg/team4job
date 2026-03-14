
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Sparkles, Loader2, ListChecks, ArrowRight, MessageSquare } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { smartSplitAction } from "@/app/actions/ai.actions";

interface SmartSplitZoneProps {
    onSplitSuccess: (jobs: any[]) => void;
}

export function SmartSplitZone({ onSplitSuccess }: SmartSplitZoneProps) {
    const [text, setText] = useState("");
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const handleAnalyze = async () => {
        if (!text.trim()) return;
        setIsAnalyzing(true);
        try {
            const res = await smartSplitAction(text);
            if (res.success && res.data?.jobs) {
                onSplitSuccess(res.data.jobs);
            } else {
                // Handle failure silently or via toast in production
            }
        } catch (error) {
            // AI Split failed
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <Card className="p-8 border-2 border-primary/20 shadow-xl bg-gradient-to-br from-background to-primary/5">
            <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <div>
                    <h3 className="text-xl font-bold">AI Smart Split</h3>
                    <p className="text-sm text-muted-foreground">Describe all your requirements in one go.</p>
                </div>
            </div>

            <div className="space-y-4">
                <Textarea
                    data-testid="smart-split-textarea"
                    placeholder="e.g. I need 4 network points for my Delhi office and electrical switchboard repair for my Mumbai warehouse. Total budget is around 50k."
                    className="min-h-[150px] text-lg bg-background/50 backdrop-blur-sm border-2 focus:border-primary transition-all p-4"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                />

                <div className="flex justify-between items-center bg-muted/30 p-4 rounded-lg border border-primary/10">
                    <div className="flex gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                            <ListChecks className="h-3 w-3" /> Detects Locations
                        </div>
                        <div className="flex items-center gap-1">
                            <Sparkles className="h-3 w-3" /> Estimates Budgets
                        </div>
                        <div className="flex items-center gap-1">
                            <ArrowRight className="h-3 w-3" /> Splits into Drafts
                        </div>
                    </div>
                    <Button
                        data-testid="smart-split-analyze-btn"
                        size="lg"
                        onClick={handleAnalyze}
                        disabled={!text.trim() || isAnalyzing}
                        className="px-8 shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
                    >
                        {isAnalyzing ? (
                            <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                Splitting...
                            </>
                        ) : (
                            <>
                                <Sparkles className="mr-2 h-5 w-5" />
                                Analyze & Split
                            </>
                        )}
                    </Button>
                </div>
            </div>

            <div className="mt-6 flex items-start gap-3 p-4 bg-primary/5 rounded-lg border border-primary/10">
                <MessageSquare className="h-5 w-5 text-primary mt-0.5" />
                <p className="text-sm text-muted-foreground italic">
                    "Hamare 3 branches hain - Pune, Bangalore aur Chennai. Har jagah networking aur electrical repairs karwane hain urgent basis pe."
                </p>
            </div>
        </Card>
    );
}
