"use client";

import { raiseDisputeAction } from "@/app/actions/job.actions";
import React from "react";
import { Job, User, Comment, PlatformSettings } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

import {
    Loader2,
    CheckCircle2,
    RefreshCcw,
    AlertOctagon,
    Ban,
    PlusCircle,
    Zap,
    ShieldCheck,
    Trophy,
    KeyRound,
    Copy,
    ArrowRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogClose,
    DialogTrigger
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useFirebase } from "@/infrastructure/firebase/client-provider";
import { useRouter } from "next/navigation";
import { getAuth } from "firebase/auth";
import { approveJobAction } from "@/app/actions/job.actions";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import axios from "axios";
import { StartWorkInput } from "./start-work-input";
import { FileUpload } from "@/components/ui/file-upload";
import { toDate } from "@/lib/utils";

// Helper to safely get the string ID
const getRefId = (ref: any): string => {
    if (!ref) return '';
    if (typeof ref === 'string') return ref;
    return ref.id || '';
};

interface ClientConfirmationSectionProps {
    job: Job;
    user: User;
    onJobUpdate: (updatedJob: Partial<Job>) => void;
    onCancel: () => void;
    onAddFunds: () => void;
}

import { useTranslations } from "next-intl";

export function ClientConfirmationSection({ job, user, onJobUpdate, onCancel, onAddFunds }: ClientConfirmationSectionProps) {
    const { toast } = useToast();
    const { storage } = useFirebase();
    const router = useRouter();
    const t = useTranslations('client.jobActions');
    const [isLoading, setIsLoading] = React.useState(false);
    const [disputeReason, setDisputeReason] = React.useState("");
    const [disputeFiles, setDisputeFiles] = React.useState<File[]>([]);

    const isclient = !!(user && job && (user.id === getRefId(job.client) || user.id === job.clientId));

    const handleApproveAndPay = async () => {
        setIsLoading(true);
        try {
            if (!user) return;

            const res = await approveJobAction(job.id, user.id);
            if (!res.success) throw new Error(res.error);

            toast({
                title: t('approveSuccess'),
                description: t('approveSuccessDesc'),
                variant: 'default'
            });

        } catch (error: any) {
           toast({
                title: t('errorTitle'),
                description: error.message || t('genericError'),
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleRaiseDispute = async () => {
        if (!user) {
            return;
        }
        if (!disputeReason.trim()) {
            toast({ title: t('reasonRequired'), description: t('reasonRequiredDesc'), variant: "destructive" });
            return;
        }
        setIsLoading(true);
        try {
            const uploadPromises = disputeFiles.map(async (file) => {
                const storageRef = ref(storage, `disputes/${job.id}/${Date.now()}-${file.name}`);
                const snapshot = await uploadBytes(storageRef, file);
                const downloadURL = await getDownloadURL(snapshot.ref);
                return { fileName: file.name, fileUrl: downloadURL, fileType: file.type };
            });
            const uploadedAttachments = await Promise.all(uploadPromises);
            const res = await raiseDisputeAction(
                job.id,
                user.id,
                "Quality Concern",
                disputeReason,
                "Job Dispute",
                uploadedAttachments
            );
            if (res.success && res.disputeId) {
                toast({ title: t('disputeSuccess'), description: t('disputeSuccessDesc') });
                router.push(`/dashboard/disputes/${res.disputeId}`);
            } else {
                throw new Error(res.error || "Failed to raise dispute");
            }
        } catch (error: any) {
            console.error("Dispute init error:", error);
            toast({ title: t('errorTitle'), description: error.message || t('genericError'), variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative group/hub"
        >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-accent/5 blur-3xl opacity-30 -z-10" />
            
            <Card className="border-none shadow-[0_40px_100px_rgba(0,0,0,0.1)] bg-surface-container-low/40 dark:bg-slate-900/60 backdrop-blur-3xl rounded-[3rem] overflow-hidden ring-1 ring-white/5 relative">
                <div className="h-2 w-full bg-gradient-to-r from-primary via-accent to-primary animate-gradient-x opacity-30" />
                
                <CardHeader className="p-10 pb-6 text-center sm:text-left relative z-10">
                    <div className="flex flex-col sm:flex-row items-center gap-10">
                        <div className="h-24 w-24 rounded-[2rem] bg-primary/10 text-primary flex items-center justify-center shadow-inner group-hover/hub:scale-110 transition-transform duration-700 relative shrink-0">
                            <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full opacity-0 group-hover/hub:opacity-100 transition-opacity" />
                            {job.status === 'Pending Confirmation' ? <CheckCircle2 className="h-12 w-12 relative z-10" /> : <ShieldCheck className="h-12 w-12 relative z-10" />}
                        </div>
                        <div className="flex-1">
                            <CardTitle className="text-6xl sm:text-7xl md:text-8xl font-black tracking-tighter italic uppercase bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent leading-[0.85] mb-4">
                                {job.status === 'Pending Confirmation' ? 'Review Protocol' : 'Mission Control'}
                            </CardTitle>
                            <CardDescription className="text-lg font-medium opacity-70 leading-relaxed max-w-xl italic">
                                {job.status === 'Pending Confirmation' 
                                    ? 'Validation hub active. Perform a terminal quality assessment before authorizing the final escrow release.'
                                    : 'Production engagement management center. Monitor mission parameters and secure the collaboration handshake.'}
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-10 pt-0 space-y-10">
                    <AnimatePresence mode="wait">
                        {/* Job Cancellation/Funding (Pre-Work) */}
                        {isclient && (job.status === 'In Progress' || job.status === 'Pending Funding') && !job.workStartedAt && (
                            <motion.div 
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="flex flex-col sm:flex-row gap-6"
                            >
                                <Button 
                                    variant="ghost" 
                                    className="h-20 flex-1 rounded-[1.5rem] font-black text-xs uppercase tracking-[0.3em] text-muted-foreground/60 hover:bg-destructive/10 hover:text-destructive transition-all italic" 
                                    onClick={onCancel}
                                >
                                    Abort Mission
                                </Button>
                                <Button 
                                    className="h-20 flex-1 rounded-[1.5rem] bg-accent text-accent-foreground font-black text-xs uppercase tracking-[0.4em] shadow-2xl shadow-accent/20 hover:shadow-accent/40 hover:-translate-y-1 transition-all active:scale-95 group overflow-hidden relative italic" 
                                    onClick={onAddFunds}
                                >
                                    <span className="relative z-10 flex items-center justify-center">
                                        Inject Capital
                                    </span>
                                    <div className="absolute inset-0 bg-background/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                                </Button>
                            </motion.div>
                        )}

                        {/* Start Code Secure Token */}
                        {isclient && (job.status === 'In Progress' || job.status === 'Pending Funding') && !job.workStartedAt && job.startOtp && (
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="p-10 bg-surface-container-low/60 backdrop-blur-md rounded-[2.5rem] border border-white/5 text-center space-y-6 group/otp relative overflow-hidden shadow-inner ring-1 ring-amber-500/10"
                            >
                                <div className="absolute top-0 right-0 p-6 opacity-5 group-hover/otp:scale-150 group-hover/otp:rotate-12 transition-transform duration-700">
                                    <KeyRound className="h-40 w-40 text-amber-500" />
                                </div>
                                <div className="relative z-10 space-y-6">
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.5em] text-amber-500/60 italic">Handshake Authorization Token</h4>
                                    <div className="flex items-center justify-center gap-6">
                                        <p className="text-6xl font-black font-mono tracking-[0.5em] text-amber-500 pl-[0.5em] drop-shadow-[0_0_15px_rgba(245,158,11,0.3)]" data-testid="start-otp-value">{job.startOtp}</p>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-14 w-14 rounded-2xl hover:bg-amber-500/10 text-amber-500 transition-all active:scale-90"
                                            onClick={() => {
                                                navigator.clipboard.writeText(job.startOtp || '');
                                                toast({ title: "TOKEN CAPTURED", description: "Authorization handshake code copied to secure buffer." });
                                            }}
                                        >
                                            <Copy className="h-6 w-6" />
                                        </Button>
                                    </div>
                                    <p className="text-[11px] text-amber-500/50 font-black uppercase tracking-[0.2em] italic">Communicate this sequence to the technical liaison to initiate work</p>
                                </div>
                            </motion.div>
                        )}

                        {/* Work Started Active Indicator */}
                        {job.workStartedAt && job.status === 'In Progress' && (
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="p-8 bg-primary/5 text-primary rounded-[2.5rem] border border-white/5 flex items-center justify-center gap-6 group/active backdrop-blur-md shadow-xl"
                            >
                                <div className="relative shrink-0">
                                    <Zap className="h-8 w-8 fill-current animate-pulse" />
                                    <div className="absolute inset-0 bg-primary/30 blur-2xl rounded-full animate-ping" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[11px] font-black uppercase tracking-[0.4em] opacity-40 italic">Production Engine Active</p>
                                    <p className="text-xl font-black italic tracking-tighter uppercase">
                                        {t('workStartedAt', { time: toDate(job.workStartedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) })}
                                    </p>
                                </div>
                            </motion.div>
                        )}

                        {/* Approval Action Hub */}
                        {job.status === 'Pending Confirmation' && (
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-6"
                            >
                                <div className="flex flex-col sm:flex-row gap-6">
                                    <Button 
                                        onClick={handleApproveAndPay} 
                                        disabled={isLoading} 
                                        className="h-24 flex-[2.5] rounded-[3rem] bg-success text-white font-black text-xs uppercase tracking-[0.4em] shadow-2xl shadow-success/30 hover:shadow-success/50 hover:-translate-y-1 transition-all active:scale-95 group overflow-hidden relative italic" 
                                        data-testid="approve-release-button"
                                    >
                                        <span className="relative z-10 flex items-center justify-center">
                                            {isLoading ? <Loader2 className="mr-3 h-8 w-8 animate-spin" /> : <Trophy className="mr-4 h-6 w-6" />}
                                            Authorize Final Release
                                        </span>
                                        <div className="absolute inset-0 bg-background/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                                    </Button>

                                    <div className="flex flex-1 gap-6">
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <Button variant="outline" className="h-24 flex-1 rounded-[2.5rem] font-black text-[11px] uppercase tracking-[0.2em] text-amber-500 border-white/5 bg-background shadow-xl hover:bg-amber-500/10 transition-all italic">
                                                    Revision
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="max-w-xl p-0 overflow-hidden border-none rounded-[3rem] bg-background font-sans shadow-2xl leading-none">
                                                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent pointer-events-none" />
                                                <div className="relative p-10 space-y-8 leading-none">
                                                    <header className="space-y-6">
                                                        <div className="inline-flex items-center justify-center h-20 w-20 rounded-[2rem] bg-amber-500/10 text-amber-500 shadow-inner mb-2 relative">
                                                            <div className="absolute inset-0 bg-amber-500/20 blur-xl rounded-full" />
                                                            <RefreshCcw className="h-10 w-10 relative z-10" />
                                                        </div>
                                                        <DialogTitle className="text-4xl font-black tracking-tighter italic uppercase text-amber-500 leading-none">
                                                            Request Adjustment
                                                        </DialogTitle>
                                                        <DialogDescription className="text-lg font-medium opacity-70 italic">
                                                            Production quality mismatch detected. Specify required corrections for the liaison.
                                                        </DialogDescription>
                                                    </header>
                                                    <div className="space-y-6">
                                                        <Label className="text-[10px] font-black uppercase tracking-[0.5em] text-muted-foreground ml-4 opacity-30 italic">Adjustment Parameters</Label>
                                                        <Textarea
                                                            value={disputeReason}
                                                            onChange={e => setDisputeReason(e.target.value)}
                                                            placeholder="Describe specific modifications required..."
                                                            className="min-h-[180px] rounded-[2rem] border-none bg-muted/40 p-8 text-lg font-medium resize-none focus-visible:ring-4 focus-visible:ring-amber-500/10 transition-all placeholder:opacity-20 shadow-inner leading-relaxed"
                                                        />
                                                    </div>
                                                    <DialogFooter className="flex flex-col sm:flex-row gap-4 mt-4">
                                                        <DialogClose asChild>
                                                            <Button variant="ghost" className="h-14 flex-1 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-muted" onClick={() => setDisputeReason("")}>Cancel</Button>
                                                        </DialogClose>
                                                        <Button 
                                                            onClick={async () => {
                                                                if (!user) return;
                                                                if (!disputeReason.trim()) {
                                                                    toast({ title: t('reasonRequired'), description: t('reasonRequiredDesc'), variant: "destructive" });
                                                                    return;
                                                                }
                                                                setIsLoading(true);
                                                                try {
                                                                    const newComment: Comment = {
                                                                        id: `COMMENT-${Date.now()}`,
                                                                        authorId: user.id,
                                                                        authorName: user.name,
                                                                        authorAvatar: user.avatarUrl,
                                                                        timestamp: new Date(),
                                                                        content: `🔴 REVISION REQUESTED: ${disputeReason}`
                                                                    };
                                                                    await onJobUpdate({ status: 'In Progress' as any, comments: [...(job.comments || []), newComment] });
                                                                    toast({ title: t('revisionSuccess'), description: t('revisionSuccessDesc') });
                                                                    setDisputeReason("");
                                                                } catch (e) {
                                                                    toast({ title: t('errorTitle'), description: t('genericError'), variant: "destructive" });
                                                                } finally {
                                                                    setIsLoading(false);
                                                                }
                                                            }} 
                                                            disabled={isLoading} 
                                                            className="h-14 flex-[2] rounded-2xl bg-amber-500 text-white font-black text-xs uppercase tracking-[0.15em] shadow-xl shadow-amber-500/20 hover:bg-amber-600"
                                                        >
                                                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                            Submit Revision Request
                                                        </Button>
                                                    </DialogFooter>
                                                </div>
                                            </DialogContent>
                                        </Dialog>

                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <Button data-testid="dispute-button" variant="ghost" className="h-24 w-16 px-0 rounded-[2.5rem] font-black text-[10px] uppercase tracking-widest text-destructive hover:bg-destructive/10 transition-all">
                                                    <AlertOctagon className="h-7 w-7" />
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="max-w-xl p-0 overflow-hidden border-none rounded-[3rem] bg-background font-sans shadow-2xl leading-none">
                                                <div className="absolute inset-0 bg-gradient-to-br from-destructive/10 to-transparent pointer-events-none" />
                                                <div className="relative p-10 space-y-8 leading-none">
                                                    <header className="space-y-6">
                                                        <div className="inline-flex items-center justify-center h-20 w-20 rounded-[2rem] bg-destructive/10 text-destructive shadow-inner mb-2 relative">
                                                            <div className="absolute inset-0 bg-destructive/20 blur-xl rounded-full" />
                                                            <AlertOctagon className="h-10 w-10 relative z-10" />
                                                        </div>
                                                        <DialogTitle className="text-4xl font-black tracking-tighter italic uppercase text-destructive leading-none">
                                                            Initialize Dispute
                                                        </DialogTitle>
                                                        <DialogDescription className="text-lg font-medium opacity-70 italic">
                                                            Arbitration protocol engaged. This action requires official platform intervention.
                                                        </DialogDescription>
                                                    </header>
                                                    <div className="space-y-6">
                                                        <div className="space-y-2">
                                                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">{t('disputeReason')}</Label>
                                                            <Textarea value={disputeReason} onChange={e => setDisputeReason(e.target.value)} placeholder={t('disputePlaceholder')} className="min-h-[120px] rounded-2xl border-none bg-muted/40 p-5 font-medium focus-visible:ring-2 focus-visible:ring-destructive/20" />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">{t('disputeEvidence')}</Label>
                                                            <div className="rounded-2xl border-2 border-dashed border-muted/50 p-2">
                                                                <FileUpload onFilesChange={setDisputeFiles} maxFiles={5} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <DialogFooter className="mt-4">
                                                        <Button onClick={handleRaiseDispute} disabled={isLoading} variant="destructive" className="h-16 w-full rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-destructive/20 active:scale-95">
                                                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                            Submit Final Dispute
                                                        </Button>
                                                    </DialogFooter>
                                                </div>
                                            </DialogContent>
                                        </Dialog>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </CardContent>
            </Card>
        </motion.div>
    );
}
