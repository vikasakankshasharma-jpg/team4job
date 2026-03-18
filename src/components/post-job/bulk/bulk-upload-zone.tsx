
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, FileText, Download, X, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { bulkJobService } from "@/domains/jobs/bulk-job.service";
import { JobTemplate } from "@/domains/ai/template.service";

interface BulkUploadZoneProps {
    template: JobTemplate;
    onUploadSuccess: (jobs: any[]) => void;
}

export function BulkUploadZone({ template, onUploadSuccess }: BulkUploadZoneProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [status, setStatus] = useState<'idle' | 'parsing' | 'success' | 'error'>('idle');
    const [error, setError] = useState<string | null>(null);

    const handleDownloadSample = () => {
        const csv = bulkJobService.generateSampleCSV(template);
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${template.name.replace(/\s+/g, '_')}_sample.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    };

    const handleFile = async (file: File) => {
        if (!file.name.endsWith('.csv')) {
            setError("Please upload a .csv file");
            setStatus('error');
            return;
        }

        setFile(file);
        setStatus('parsing');
        setError(null);

        try {
            const content = await file.text();
            const parsedJobs = bulkJobService.parseCSV(content, template);

            setTimeout(() => {
                setStatus('success');
                onUploadSuccess(parsedJobs);
            }, 1500); // Simulate processing for smooth UX
        } catch (err) {
            setError("Failed to parse CSV. Please check the format.");
            setStatus('error');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold">Bulk Upload via Spreadsheet</h3>
                    <p className="text-sm text-muted-foreground">Download the sample, fill it, and upload.</p>
                </div>
                <Button 
                    data-testid="download-sample-csv"
                    variant="outline" 
                    size="sm" 
                    onClick={handleDownloadSample}
                >
                    <Download className="mr-2 h-4 w-4" />
                    Download Sample
                </Button>
            </div>

            <motion.div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    const droppedFile = e.dataTransfer.files[0];
                    if (droppedFile) handleFile(droppedFile);
                }}
                className={`
                    border-2 border-dashed rounded-xl p-12 text-center transition-all
                    ${isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/20'}
                    ${status === 'success' ? 'border-green-500 bg-green-50/50' : ''}
                `}
            >
                <AnimatePresence mode="wait">
                    {status === 'idle' && (
                        <motion.div
                            key="idle"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                        >
                            <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Upload className="h-8 w-8 text-primary" />
                            </div>
                            <p className="text-lg font-medium">Drag and drop your CSV here</p>
                            <p className="text-sm text-muted-foreground mt-1">or click to browse from your computer</p>
                            <input
                                type="file"
                                accept=".csv"
                                className="hidden"
                                id="file-upload"
                                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                            />
                            <Button variant="secondary" className="mt-6" asChild>
                                <label htmlFor="file-upload" className="cursor-pointer">Choose File</label>
                            </Button>
                        </motion.div>
                    )}

                    {status === 'parsing' && (
                        <motion.div
                            key="parsing"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex flex-col items-center"
                        >
                            <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
                            <p className="font-medium">Analyzing your spreadsheet...</p>
                            <p className="text-sm text-muted-foreground mt-1">Mapping columns to {template.name} template.</p>
                        </motion.div>
                    )}

                    {status === 'success' && (
                        <motion.div
                            key="success"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex flex-col items-center"
                        >
                            <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
                            <p className="font-medium text-green-700">File Parsed Successfully!</p>
                            <p className="text-sm text-green-600 mt-1">{file?.name}</p>
                            <Button variant="outline" size="sm" className="mt-4" onClick={() => setStatus('idle')}>
                                Change File
                            </Button>
                        </motion.div>
                    )}

                    {status === 'error' && (
                        <motion.div
                            key="error"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex flex-col items-center"
                        >
                            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
                            <p className="font-medium text-destructive">{error}</p>
                            <Button variant="outline" size="sm" className="mt-4" onClick={() => setStatus('idle')}>
                                Try Again
                            </Button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>

            <div className="flex items-center gap-3 text-sm text-muted-foreground bg-muted/50 p-4 rounded-lg border">
                <FileText className="h-5 w-5 text-primary" />
                <p>
                    <strong>Tip:</strong> Ensure your columns match the sample file. We automatically map &quot;Title&quot;, &quot;Address&quot;, &quot;Pincode&quot;, and &quot;Budget&quot;.
                </p>
            </div>
        </div>
    );
}
