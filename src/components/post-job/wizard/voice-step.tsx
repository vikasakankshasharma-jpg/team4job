
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
                <Card className="p-12 shadow-[0_45px_120px_rgba(0,0,0,0.2)] border-none overflow-hidden relative bg-card/40 backdrop-blur-3xl group rounded-[3.5rem] ring-1 ring-white/5">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary to-accent" />
                    <div className="absolute top-0 right-0 p-12 opacity-5 group-hover:opacity-10 transition-all duration-700 pointer-events-none transform group-hover:rotate-12">
                        <Mic className="h-48 w-48" />
                    </div>
 
                    <h2 className="text-4xl font-black italic tracking-tighter uppercase leading-none mb-4">Voice Intake</h2>
                    <p className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.4em] opacity-50 italic mb-12 max-w-sm">
                        Describe what needs to be done for your <span className="text-primary">{category}</span> job. We&apos;ll use AI to generate the full post.
                    </p>

                    <div className="flex flex-col items-center justify-center gap-10 py-12 relative">
                        {isProcessing && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="h-40 w-40 rounded-full bg-primary/20 animate-ping opacity-75" />
                                <div className="absolute h-48 w-48 rounded-full border-2 border-primary/30 animate-spin-slow opacity-50" />
                            </div>
                        )}
                        <VoiceInput 
                            onTranscript={handleTranscript} 
                            isProcessing={isProcessing}
                            className="h-28 w-28 shadow-[0_20px_60px_rgba(var(--primary),0.3)] relative z-10 rounded-[1.5rem]"
                        />
                        
                        <div className="space-y-4 max-w-sm w-full relative z-10 text-center">
                            <p className="text-sm font-bold uppercase tracking-widest text-primary animate-pulse">
                                {isProcessing ? "Analyzing your voice..." : "Click the mic and start talking"}
                            </p>
                            {transcript && (
                                <div className="p-8 rounded-[1.5rem] bg-muted/30 border border-muted-foreground/20 italic text-sm text-foreground/90 font-black tracking-wide uppercase shadow-inner opacity-70">
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
