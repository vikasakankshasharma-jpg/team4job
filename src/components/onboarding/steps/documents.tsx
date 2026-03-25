"use client";

import { useDropzone } from "react-dropzone";
import { Label } from "@/components/ui/label";
import { UploadCloud, CheckCircle, X, ShieldCheck, FileText, Camera } from "lucide-react";
import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { compressImage } from "@/lib/image-compression";
import { cn } from "@/lib/utils";
import * as m from "framer-motion";
const { motion, AnimatePresence } = m;

interface DocumentsProps {
    data: any;
    updateData: (data: any) => void;
}

function FileUploader({ 
    label, 
    description,
    file, 
    icon: Icon,
    onDrop, 
    onRemove 
}: { 
    label: string, 
    description?: string,
    file?: File, 
    icon: any,
    onDrop: (files: File[]) => void, 
    onRemove: () => void 
}) {
    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        maxFiles: 1,
        accept: { 'image/*': ['.jpeg', '.jpg', '.png'], 'application/pdf': ['.pdf'] }
    });

    return (
        <div className="space-y-3 group">
            <div className="flex flex-col gap-1 ml-1">
                <Label className="text-sm font-bold uppercase tracking-widest text-muted-foreground">{label}</Label>
                {description && <p className="text-xs text-muted-foreground/70">{description}</p>}
            </div>
            
            <AnimatePresence mode="wait">
                {!file ? (
                    <motion.div
                        key="uploader"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        {...getRootProps()}
                        className={cn(
                            "relative border-2 border-dashed rounded-[2rem] p-8 flex flex-col items-center justify-center cursor-pointer transition-all duration-500 overflow-hidden min-h-[180px]",
                            isDragActive 
                                ? "border-primary bg-primary/10 scale-[1.02] shadow-2xl shadow-primary/20" 
                                : "border-muted-foreground/20 bg-muted/5 hover:border-primary/40 hover:bg-muted/10"
                        )}
                    >
                        <input {...getInputProps()} />
                        <div className={cn(
                            "w-16 h-16 rounded-2xl bg-background flex items-center justify-center mb-4 shadow-sm transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3",
                            isDragActive ? "bg-primary text-white" : "text-muted-foreground"
                        )}>
                            <Icon className="h-8 w-8" />
                        </div>
                        <p className="text-sm font-bold text-center">
                            {isDragActive ? "Drop to upload" : "Drag & drop or Click"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">JPEG, PNG, PDF (Max 5MB)</p>
                        
                        {/* Decorative background element */}
                        <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors" />
                    </motion.div>
                ) : (
                    <motion.div
                        key="file-info"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="relative flex items-center justify-between p-5 border-2 rounded-[2rem] bg-primary/5 border-primary/20 shadow-lg shadow-primary/5 group/card overflow-hidden"
                    >
                        <div className="flex items-center gap-4 relative z-10">
                            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
                                <CheckCircle className="h-6 w-6" />
                            </div>
                            <div className="text-sm truncate max-w-[180px] md:max-w-[300px]">
                                <p className="font-bold text-foreground truncate">{file.name}</p>
                                <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                            </div>
                        </div>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={(e) => {
                                e.stopPropagation();
                                onRemove();
                            }} 
                            className="h-10 w-10 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition-all relative z-10"
                        >
                            <X className="h-5 w-5" />
                        </Button>
                        
                        {/* Shine Effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover/card:animate-shine" />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export function Documents({ data, updateData }: DocumentsProps) {

    const handleDrop = useCallback((field: string) => async (acceptedFiles: File[]) => {
        if (acceptedFiles?.length > 0) {
            const file = acceptedFiles[0];
            const compressedFile = await compressImage(file);
            updateData({ [field]: compressedFile });
        }
    }, [updateData]);

    return (
        <div className="space-y-10">
            <div className="space-y-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-primary/10 rounded-2xl">
                        <ShieldCheck className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                            Identity Verification
                        </h2>
                        <p className="text-muted-foreground">Secure KYC process to verify your professional credentials.</p>
                    </div>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                <FileUploader
                    label="Aadhar Card (Front)"
                    description="Clear image of your Aadhar card front side"
                    file={data.aadharFront}
                    icon={FileText}
                    onDrop={handleDrop('aadharFront')}
                    onRemove={() => updateData({ ...data, aadharFront: undefined })}
                />
                <FileUploader
                    label="Aadhar Card (Back)"
                    description="Clear image of your Aadhar card back side"
                    file={data.aadharBack}
                    icon={FileText}
                    onDrop={handleDrop('aadharBack')}
                    onRemove={() => updateData({ ...data, aadharBack: undefined })}
                />
                <FileUploader
                    label="PAN Card"
                    description="Official PAN card document or scan"
                    file={data.panCard}
                    icon={ShieldCheck}
                    onDrop={handleDrop('panCard')}
                    onRemove={() => updateData({ ...data, panCard: undefined })}
                />
                <FileUploader
                    label="Profile Photo"
                    description="Recent selfie for profile identity check"
                    file={data.profilePhoto}
                    icon={Camera}
                    onDrop={handleDrop('profilePhoto')}
                    onRemove={() => updateData({ ...data, profilePhoto: undefined })}
                />
            </div>

            <div className="p-6 rounded-[2rem] bg-muted/20 border border-border/50 text-xs text-muted-foreground leading-relaxed">
                <p className="font-bold mb-2 flex items-center gap-1.5 uppercase tracking-wider">
                    <ShieldCheck className="h-3.5 w-3.5" /> Privacy Assurance
                </p>
                Your documents are encrypted and used only for identity verification purposes. We do not share your private documents with any third-party marketing services.
            </div>
        </div>
    );
}
