
"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, Image as ImageIcon, Sparkles, Loader2, ArrowLeft, Upload } from "lucide-react";

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
                <Card className="p-8 shadow-xl border-2 border-primary/10 bg-gradient-to-b from-background to-secondary/5 text-center">
                    <h2 className="text-2xl font-bold mb-2">Visual Job Posting</h2>
                    <p className="text-muted-foreground mb-8">
                        Upload a photo of the site or equipment. Our AI will analyze it to plan your {category} work.
                    </p>

                    <div className="flex flex-col items-center justify-center gap-6">
                        <div 
                            className="w-full aspect-video rounded-2xl border-2 border-dashed border-primary/20 bg-muted/30 flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-all overflow-hidden relative group"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {preview ? (
                                <img src={preview} alt="Upload Preview" className="w-full h-full object-cover" />
                            ) : (
                                <>
                                    <div className="p-4 rounded-full bg-primary/10 text-primary mb-3 group-hover:scale-110 transition-transform">
                                        <Camera className="h-8 w-8" />
                                    </div>
                                    <span className="text-sm font-medium">Click to upload or take a photo</span>
                                    <span className="text-xs text-muted-foreground mt-1">PNG, JPG up to 5MB</span>
                                </>
                            )}
                            
                            {isProcessing && (
                                <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center gap-2">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                    <span className="text-sm font-medium">Analyzing image...</span>
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
                            className="w-full h-12 text-lg rounded-xl"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isProcessing}
                        >
                            <Upload className="mr-2 h-5 w-5" /> Select Image
                        </Button>
                    </div>

                    <div className="mt-8 flex justify-between pt-6 border-t border-border/50">
                        <Button variant="ghost" onClick={onBack} disabled={isProcessing}>
                            <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
                        </Button>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Sparkles className="h-3 w-3 text-primary" />
                            Vision AI Analysis
                        </div>
                    </div>
                </Card>
            </motion.div>
        </div>
    );
}
