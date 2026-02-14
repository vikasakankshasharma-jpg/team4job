"use client";

import { useDropzone } from "react-dropzone";
import { Label } from "@/components/ui/label";
import { UploadCloud, CheckCircle, X } from "lucide-react";
import { useCallback } from "react";
import { Button } from "@/components/ui/button";

interface DocumentsProps {
    data: any;
    updateData: (data: any) => void;
}

function FileUploader({ label, file, onDrop, onRemove }: { label: string, file?: File, onDrop: (files: File[]) => void, onRemove: () => void }) {
    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        maxFiles: 1,
        accept: { 'image/*': ['.jpeg', '.jpg', '.png'], 'application/pdf': ['.pdf'] }
    });

    return (
        <div className="space-y-2">
            <Label>{label}</Label>
            {!file ? (
                <div
                    {...getRootProps()}
                    className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer transition-colors ${isDragActive ? 'border-primary bg-primary/10' : 'border-muted-foreground/25 hover:border-primary/50'}`}
                >
                    <input {...getInputProps()} />
                    <UploadCloud className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground text-center">
                        {isDragActive ? "Drop the file here" : "Drag & drop or click to upload"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">JPEG, PNG, PDF (Max 5MB)</p>
                </div>
            ) : (
                <div className="flex items-center justify-between p-3 border rounded-lg bg-green-50/50 dark:bg-green-900/10 border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-3">
                        <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                        <div className="text-sm truncate max-w-[200px]">
                            <p className="font-medium text-foreground">{file.name}</p>
                            <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onRemove} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            )}
        </div>
    );
}

export function Documents({ data, updateData }: DocumentsProps) {

    const handleDrop = useCallback((field: string) => (acceptedFiles: File[]) => {
        if (acceptedFiles?.length > 0) {
            updateData({ [field]: acceptedFiles[0] });
        }
    }, [updateData]);

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-semibold">Verify Identity (KYC)</h2>
            <p className="text-sm text-muted-foreground -mt-4">
                We need to verify your identity to approve your installer profile.
            </p>

            <div className="grid md:grid-cols-2 gap-6">
                <FileUploader
                    label="Aadhar Card (Front)"
                    file={data.aadharFront}
                    onDrop={handleDrop('aadharFront')}
                    onRemove={() => updateData({ ...data, aadharFront: undefined })}
                />
                <FileUploader
                    label="Aadhar Card (Back)"
                    file={data.aadharBack}
                    onDrop={handleDrop('aadharBack')}
                    onRemove={() => updateData({ ...data, aadharBack: undefined })}
                />
                <FileUploader
                    label="PAN Card"
                    file={data.panCard}
                    onDrop={handleDrop('panCard')}
                    onRemove={() => updateData({ ...data, panCard: undefined })}
                />
                <FileUploader
                    label="Profile Photo (Selfie)"
                    file={data.profilePhoto}
                    onDrop={handleDrop('profilePhoto')}
                    onRemove={() => updateData({ ...data, profilePhoto: undefined })}
                />
            </div>
        </div>
    );
}
