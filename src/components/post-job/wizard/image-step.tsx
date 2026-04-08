
"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, Image as ImageIcon, Sparkles, Loader2, ArrowLeft, Upload } from "lucide-react";
import NextImage from "next/image";

interface ImageStepProps {
    onAnalyze: (base64: string) => Promise<void>;
    onBack: () => void;
    category: string;
}

export function ImageStep({ onAnalyze, onBack, category }: ImageStepProps) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [preview, setPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Preview
        const reader = new FileReader();
        reader.onloadend = () => {
            setPreview(reader.result as string);
        };
        reader.readAsDataURL(file);

        // Analyze
        setIsProcessing(true);
        try {
            const base64Reader = new FileReader();
            base64Reader.onloadend = async () => {
                const base64 = (base64Reader.result as string).split(',')[1];
                await onAnalyze(base64);
            };
            base64Reader.readAsDataURL(file);
        } finally {
            // Processing state is usually managed by the parent or handled after the promise
        }
    };

    return (
        <div className="mx-auto w-full max-w-lg p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
            >
                <Card className="p-12 shadow-[0_45px_120px_rgba(0,0,0,0.2)] border-none overflow-hidden relative bg-card/40 backdrop-blur-3xl rounded-[3.5rem] ring-1 ring-white/5">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-accent to-primary" />
                    <h2 className="text-4xl font-black italic tracking-tighter uppercase leading-none mb-4">Vision Intake</h2>
                    <p className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.4em] opacity-50 italic mb-12 max-w-sm mx-auto text-center leading-relaxed">
                        Upload a photo of the site or equipment. Our AI will analyze it to plan your <span className="text-primary">{category}</span> work.
                    </p>
 
                    <div className="flex flex-col items-center justify-center gap-10">
                        <div 
                            className={`w-full aspect-video rounded-[3rem] border-2 border-dashed transition-all overflow-hidden relative group cursor-pointer flex flex-col items-center justify-center shadow-inner ring-1 ring-white/5
                                ${isProcessing ? 'border-primary/50 bg-primary/10' : 'border-white/10 bg-background/20 hover:border-primary/40 hover:bg-background/40 shadow-2xl'}
                            `}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {preview ? (
                                <NextImage 
                                    src={preview} 
                                    alt="Upload Preview" 
                                    fill 
                                    className={`object-cover transition-opacity duration-700 ${isProcessing ? 'opacity-30 blur-sm' : 'opacity-100 group-hover:scale-110'}`} 
                                    unoptimized
                                />
                            ) : (
                                <div className="text-center p-8 flex flex-col items-center">
                                    <div className="h-24 w-24 rounded-[1.5rem] bg-primary/10 flex items-center justify-center text-primary mb-8 group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-500 shadow-inner ring-1 ring-primary/20">
                                        <Camera className="h-10 w-10 text-primary transition-transform duration-500 group-hover:rotate-6" />
                                    </div>
                                    <span className="text-sm font-black italic uppercase tracking-[0.3em]">Operational Scan</span>
                                    <span className="text-[9px] font-black uppercase tracking-[0.4em] text-muted-foreground mt-4 opacity-50 italic">PNG, JPG // MAX 5MB</span>
                                </div>
                            )}
                            
                            {isProcessing && (
                                <div className="absolute inset-0 bg-background/60 backdrop-blur-md flex flex-col items-center justify-center gap-6">
                                    <div className="h-20 w-20 bg-background/60 backdrop-blur-3xl rounded-[1.25rem] shadow-2xl flex items-center justify-center ring-1 ring-white/10">
                                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                                    </div>
                                    <span className="text-[10px] font-black italic uppercase tracking-[0.4em] text-foreground shadow-sm bg-background/80 px-6 py-2 rounded-full ring-1 ring-white/10">Vectorizing Visual Stream...</span>
                                </div>
                            )}
                        </div>
 
                        <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            ref={fileInputRef} 
                            onChange={handleFileChange}
                            disabled={isProcessing}
                        />

                        <Button 
                            className="w-full h-16 text-[10px] font-black italic uppercase tracking-[0.4em] rounded-[1.5rem] shadow-[0_20px_60px_rgba(var(--primary),0.3)] hover:scale-[1.02] transition-all"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isProcessing}
                        >
                            <Upload className="mr-3 h-5 w-5" /> {preview ? 'Update Visual' : 'Establish Visual'}
                        </Button>
                    </div>
 
                    <div className="mt-10 flex justify-between items-center pt-6 border-t border-border/50">
                        <Button variant="ghost" onClick={onBack} disabled={isProcessing} className="hover:bg-muted/50">
                            <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
                        </Button>
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground opacity-70">
                            <Sparkles className="h-4 w-4 text-primary" />
                            Vision AI Analysis
                        </div>
                    </div>
                </Card>
            </motion.div>
        </div>
    );
}
