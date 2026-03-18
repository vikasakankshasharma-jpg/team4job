
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
                <Card className="p-8 shadow-2xl border-0 overflow-hidden relative bg-card group">
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary to-accent" />
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity duration-700 pointer-events-none">
                        <Mic className="h-32 w-32" />
                    </div>
 
                    <h2 className="text-3xl font-extrabold tracking-tight mb-3">Speak your requirements</h2>
                    <p className="text-muted-foreground text-lg font-medium opacity-80 mb-10 max-w-sm mx-auto">
                        Describe what needs to be done for your <span className="text-primary font-bold">{category}</span> job. We&apos;ll use AI to generate the full post.
                    </p>

                    <div className="flex flex-col items-center justify-center gap-8 py-10 relative">
                        {isProcessing && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="h-32 w-32 rounded-full bg-primary/20 animate-ping opacity-75" />
                                <div className="absolute h-40 w-40 rounded-full border-2 border-primary/30 animate-spin-slow opacity-50" />
                            </div>
                        )}
                        <VoiceInput 
                            onTranscript={handleTranscript} 
                            isProcessing={isProcessing}
                            className="h-24 w-24 shadow-xl shadow-primary/20 relative z-10"
                        />
                        
                        <div className="space-y-4 max-w-sm w-full relative z-10 text-center">
                            <p className="text-sm font-bold uppercase tracking-widest text-primary animate-pulse">
                                {isProcessing ? "Analyzing your voice..." : "Click the mic and start talking"}
                            </p>
                            {transcript && (
                                <div className="p-4 rounded-xl bg-muted/30 border border-muted-foreground/20 italic text-sm text-foreground/90 font-medium">
                                    &quot;{transcript}&quot;
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="mt-10 flex justify-between items-center pt-6 border-t border-border/50">
                        <Button variant="ghost" onClick={onBack} disabled={isProcessing} className="hover:bg-muted/50">
                            <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
                        </Button>
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground opacity-70">
                            <Sparkles className="h-4 w-4 text-primary" />
                            AI Powered Analysis
                        </div>
                    </div>
                </Card>
            </motion.div>
        </div>
    );
}
