
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
                <Card className="p-8 shadow-2xl border-0 overflow-hidden relative bg-card">
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-accent to-primary" />
                    <h2 className="text-3xl font-extrabold tracking-tight mb-3">Visual Job Posting</h2>
                    <p className="text-muted-foreground text-lg font-medium opacity-80 mb-10 max-w-sm mx-auto text-center">
                        Upload a photo of the site or equipment. Our AI will analyze it to plan your <span className="text-primary font-bold">{category}</span> work.
                    </p>
 
                    <div className="flex flex-col items-center justify-center gap-8">
                        <div 
                            className={`w-full aspect-video rounded-3xl border-2 border-dashed transition-all overflow-hidden relative group cursor-pointer flex flex-col items-center justify-center
                                ${isProcessing ? 'border-primary/50 bg-primary/5' : 'border-muted-foreground/20 bg-muted/5 hover:border-primary/40 hover:bg-muted/10 shadow-sm hover:shadow-md'}
                            `}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {preview ? (
                                <NextImage 
                                    src={preview} 
                                    alt="Upload Preview" 
                                    fill 
                                    className={`object-cover transition-opacity duration-300 ${isProcessing ? 'opacity-30 blur-sm' : 'opacity-100 group-hover:scale-105'}`} 
                                    unoptimized
                                />
                            ) : (
                                <div className="text-center p-6 flex flex-col items-center">
                                    <div className="h-20 w-20 rounded-2xl bg-primary/5 flex items-center justify-center text-primary mb-6 group-hover:bg-primary/10 group-hover:scale-110 transition-all duration-300">
                                        <Camera className="h-10 w-10 text-primary/80" />
                                    </div>
                                    <span className="text-lg font-bold">Click to upload or take a photo</span>
                                    <span className="text-sm font-medium text-muted-foreground mt-2 opacity-80 uppercase tracking-widest">PNG, JPG up to 5MB</span>
                                </div>
                            )}
                            
                            {isProcessing && (
                                <div className="absolute inset-0 bg-background/50 backdrop-blur-[2px] flex flex-col items-center justify-center gap-4">
                                    <div className="h-16 w-16 bg-background rounded-2xl shadow-xl flex items-center justify-center">
                                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                    </div>
                                    <span className="text-sm font-bold uppercase tracking-widest text-foreground shadow-sm bg-background/80 px-4 py-1.5 rounded-full">Analyzing image...</span>
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
                            className="w-full h-16 text-lg font-extrabold rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] transition-transform"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isProcessing}
                        >
                            <Upload className="mr-2 h-6 w-6" /> {preview ? 'Change Image' : 'Select Image'}
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
