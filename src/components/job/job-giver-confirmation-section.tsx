"use client";

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
    Zap
} from "lucide-react";
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
import { useFirebase } from "@/hooks/use-user";
import { useRouter } from "next/navigation";
import { getAuth } from "firebase/auth";
import { approveJobAction } from "@/app/actions/job.actions";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import axios from "axios";
import { StartWorkInput } from "./start-work-input";
import { FileUpload } from "@/components/ui/file-upload";

// Helper to safely get the string ID
const getRefId = (ref: any): string => {
    if (!ref) return '';
    if (typeof ref === 'string') return ref;
    return ref.id || '';
};

interface JobGiverConfirmationSectionProps {
    job: Job;
    user: User;
    onJobUpdate: (updatedJob: Partial<Job>) => void;
    onCancel: () => void;
    onAddFunds: () => void;
}

export function JobGiverConfirmationSection({ job, user, onJobUpdate, onCancel, onAddFunds }: JobGiverConfirmationSectionProps) {
    const { toast } = useToast();
    const { storage } = useFirebase();
    const router = useRouter();
    const [isLoading, setIsLoading] = React.useState(false);
    const [disputeReason, setDisputeReason] = React.useState("");
    const [disputeFiles, setDisputeFiles] = React.useState<File[]>([]);

    const isJobGiver = !!(user && job && (user.id === getRefId(job.jobGiver) || user.id === job.jobGiverId));

    const handleApproveAndPay = async () => {
        setIsLoading(true);
        try {
            if (!user) return;

            const res = await approveJobAction(job.id, user.id);
            if (!res.success) throw new Error(res.error);

            toast({
                title: "Job Approved & Payment Released!",
                description: "The payment has been released to the installer.",
                variant: 'default'
            });

        } catch (error: any) {
            console.error("Error approving job:", error);
            toast({
                title: "Error Approving Job",
                description: error.message || "An unexpected error occurred.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleRaiseDispute = async () => {
        if (!disputeReason.trim() || disputeFiles.length === 0) {
            toast({ title: "Evidence Required", description: "Please provide a reason and upload evidence.", variant: "destructive" });
            return;
        }
        if (!user || !storage) return;

        setIsLoading(true);
        try {
            const uploadPromises = disputeFiles.map(async (file) => {
                const storageRef = ref(storage, `disputes/${job.id}/${Date.now()}_${file.name}`);
                await uploadBytes(storageRef, file);
                const downloadURL = await getDownloadURL(storageRef);
                return { fileName: file.name, fileUrl: downloadURL, fileType: file.type };
            });
            const uploadedAttachments = await Promise.all(uploadPromises);

            const newDisputeId = `DISPUTE-${Date.now()}`;
            const awardedInstaller = job.awardedInstaller as User;

            const disputeData = {
                id: newDisputeId,
                requesterId: user.id,
                category: "Job Dispute",
                title: `Dispute for Job: ${job.title}`,
                jobId: job.id,
                jobTitle: job.title,
                status: 'Open',
                reason: disputeReason,
                parties: {
                    jobGiverId: getRefId(job.jobGiver),
                    installerId: awardedInstaller.id || getRefId(job.awardedInstaller),
                },
                messages: [{
                    authorId: user.id,
                    authorRole: "Job Giver",
                    content: disputeReason,
                    timestamp: new Date().toISOString(),
                    attachments: uploadedAttachments
                }],
                createdAt: new Date().toISOString(),
            };

            const auth = getAuth();
            const token = await auth.currentUser?.getIdToken();

            await axios.post('/api/disputes/create', { ...disputeData }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            await onJobUpdate({ status: 'Disputed' as any, disputeId: newDisputeId });

            toast({ title: "Dispute Raised", description: "The dispute has been submitted for admin review." });
            router.push(`/dashboard/disputes/${newDisputeId}`);

        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to raise dispute.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
            <CardHeader>
                <CardTitle>Confirm Job Completion</CardTitle>
                <CardDescription>The installer has submitted the job for your review. Please examine the proof of work and either approve completion or raise a dispute if there are issues.</CardDescription>
            </CardHeader>
            <CardContent>
                {/* Job Cancellation (Pre-Work only) */}
                {isJobGiver && job.status === 'In Progress' && !job.workStartedAt && (
                    <div className="space-y-4">
                        <Button variant="outline" className="w-full text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700" onClick={onCancel}>
                            <Ban className="mr-2 h-4 w-4" />
                            Cancel Job
                        </Button>
                        <Button variant="secondary" className="w-full" onClick={onAddFunds}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add Funds (Extras)
                        </Button>
                    </div>
                )}

                {isJobGiver && (job.status === 'In Progress' || job.status === 'Pending Funding') && !job.workStartedAt && job.startOtp && (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md text-center space-y-2" data-testid="start-otp-display">
                        <h4 className="text-sm font-semibold text-yellow-800">Start Code</h4>
                        <p className="text-3xl font-mono font-bold tracking-wider text-yellow-900" data-testid="start-otp-value">{job.startOtp}</p>
                        <p className="text-xs text-yellow-700">Share this with installer on arrival.</p>
                    </div>
                )}

                {/* Start Work OTP Input (Installer) */}
                {!isJobGiver && job.status === 'In Progress' && !job.workStartedAt && (
                    <StartWorkInput job={job} user={user!} onJobUpdate={onJobUpdate} />
                )}

                {/* Work Started Indicator */}
                {job.workStartedAt && job.status === 'In Progress' && (
                    <div className="p-3 bg-blue-50 text-blue-700 rounded-md text-sm flex items-center justify-center">
                        <Zap className="h-4 w-4 mr-2" />
                        Work Started at {new Date((job.workStartedAt as any).toDate ? (job.workStartedAt as any).toDate() : job.workStartedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                )}

                {/* Completion Action (Installer) - Only after start */}
                {!isJobGiver && job.status === 'In Progress' && job.workStartedAt && (
                    <div className="space-y-4">
                        <p className="text-sm">Submit your work to get paid.</p>
                        <Button className="w-full" onClick={() => {
                            const el = document.getElementById('completion-section');
                            if (el) el.scrollIntoView({ behavior: 'smooth' });
                        }}>Submit Work for Completion</Button>
                    </div>
                )}
                {job.status === 'Pending Confirmation' && (
                    <div className="flex flex-col sm:flex-row gap-4">
                        <Button onClick={handleApproveAndPay} disabled={isLoading} className="flex-1" data-testid="approve-release-button">
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Approve & Release Payment
                        </Button>
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="secondary" className="flex-1 bg-amber-500 hover:bg-amber-600 text-white">
                                    <RefreshCcw className="mr-2 h-4 w-4" />
                                    Request Revision
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Request Revision</DialogTitle>
                                    <DialogDescription>Ask the installer to make changes. This will set the job status back to &quot;In Progress&quot;.</DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label>Reason for Revision (Required)</Label>
                                        <Textarea
                                            value={disputeReason}
                                            onChange={e => setDisputeReason(e.target.value)}
                                            placeholder="e.g. The wiring is exposed, please fix it..."
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <DialogClose asChild>
                                        <Button variant="outline" onClick={() => setDisputeReason("")}>Cancel</Button>
                                    </DialogClose>
                                    <Button onClick={async () => {
                                        if (!user) return;
                                        if (!disputeReason.trim()) {
                                            toast({ title: "Reason Required", description: "Please explain what needs to be revised.", variant: "destructive" });
                                            return;
                                        }
                                        setIsLoading(true);
                                        try {
                                            const newComment: Comment = {
                                                id: `COMMENT-${Date.now()}`,
                                                author: user,
                                                timestamp: new Date(),
                                                content: `🔴 REVISION REQUESTED: ${disputeReason}`
                                            };

                                            await onJobUpdate({
                                                status: 'In Progress' as any,
                                                comments: [...(job.comments || []), newComment]
                                            });

                                            toast({ title: "Revision Requested", description: "Job status reverted to 'In Progress'." });
                                            setDisputeReason("");
                                        } catch (e) {
                                            console.error(e);
                                            toast({ title: "Error", description: "Failed to request revision.", variant: "destructive" });
                                        } finally {
                                            setIsLoading(false);
                                        }
                                    }} disabled={isLoading} variant="secondary" className="bg-amber-500 hover:bg-amber-600 text-white">
                                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Request Revision
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>

                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="destructive" className="flex-1">
                                    <AlertOctagon className="mr-2 h-4 w-4" />
                                    Raise a Dispute
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Raise a Dispute</DialogTitle>
                                    <DialogDescription>If the work is incomplete or unsatisfactory, provide details and evidence below.</DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label>Reason</Label>
                                        <Textarea value={disputeReason} onChange={e => setDisputeReason(e.target.value)} placeholder="Explain the issue..." />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Evidence (Required)</Label>
                                        <FileUpload onFilesChange={setDisputeFiles} maxFiles={5} />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button onClick={handleRaiseDispute} disabled={isLoading} variant="destructive">
                                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Submit Dispute
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
