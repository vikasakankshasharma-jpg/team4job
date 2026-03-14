
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { VoiceInput } from "@/components/ui/voice-input";
import { Mic, Sparkles, Loader2, ArrowLeft } from "lucide-react";

interface VoiceStepProps {
    onAnalyze: (transcript: string) => Promise<void>;
    onBack: () => void;
    category: string;
}

export function VoiceStep({ onAnalyze, onBack, category }: VoiceStepProps) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [transcript, setTranscript] = useState("");

    const handleTranscript = async (text: string) => {
        setTranscript(text);
        setIsProcessing(true);
        try {
            await onAnalyze(text);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="mx-auto w-full max-w-lg p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
            >
                <Card className="p-8 shadow-xl border-2 border-primary/10 bg-gradient-to-b from-background to-primary/5 text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Mic className="h-24 w-24" />
                    </div>

                    <h2 className="text-2xl font-bold mb-2">Speak your requirements</h2>
                    <p className="text-muted-foreground mb-8">
                        Describe what needs to be done for your {category} job. We'll use AI to generate the full post.
                    </p>

                    <div className="flex flex-col items-center justify-center gap-6 py-8">
                        <VoiceInput 
                            onTranscript={handleTranscript} 
                            isProcessing={isProcessing}
                            className="h-20 w-20"
                        />
                        
                        <div className="space-y-2">
                            <p className="text-sm font-medium animate-pulse text-primary">
                                {isProcessing ? "Analyzing your voice..." : "Click the mic and start talking"}
                            </p>
                            {transcript && (
                                <p className="text-xs text-muted-foreground italic px-4 bg-background/50 py-2 rounded-lg border border-dashed">
                                    "{transcript}"
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="mt-8 flex justify-between pt-6 border-t border-border/50">
                        <Button variant="ghost" onClick={onBack} disabled={isProcessing}>
                            <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
                        </Button>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Sparkles className="h-3 w-3 text-primary" />
                            AI Powered Analysis
                        </div>
                    </div>
                </Card>
            </motion.div>
        </div>
    );
}
