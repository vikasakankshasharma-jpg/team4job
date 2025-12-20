

"use client";

import { useUser, useFirebase } from "@/hooks/use-user";
import { notFound, useParams, useSearchParams, useRouter } from "next/navigation";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    CardFooter,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
// Removed duplicate import
import { moderateMessage } from "@/ai/flows/moderate-message";
import { analyzePhoto } from "@/ai/flows/analyze-photo";
import { ShieldAlert, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogClose,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

import {
    Calendar,
    Clock,
    IndianRupee,
    MapPin,
    MessageSquare,
    Paperclip,
    ShieldCheck,
    Star,
    Users,
    Zap,
    Loader2,
    Trash2,
    Pencil,
    Award,
    CheckCircle2,
    TrendingUp,
    Trophy,
    CalendarDays,
    KeyRound,
    Copy,
    AlertOctagon,
    FileIcon,
    X,
    Send,
    Lock,
    Wallet,
    Hourglass,
    ThumbsDown,
    Archive,
    FileText,
    Ban,
    Gift,
    Check,
    Edit,
    Plus,
    BrainCircuit,
    Lightbulb,
    Unlock,
    Heart,
    UserX,
    RefreshCcw,
} from "lucide-react";
import { format, formatDistanceToNow, isPast } from "date-fns";
import React from "react";
import { analyzeBidsFlow, AnalyzeBidsOutput } from "@/ai/flows/analyze-bids";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Bid, Job, Comment, User, JobAttachment, PrivateMessage, Dispute, Transaction, Invoice, PlatformSettings, AdditionalTask } from "@/lib/types";
import { AnimatedAvatar } from "@/components/ui/animated-avatar";
import { getStatusVariant, toDate, cn, validateMessageContent } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { doc, getDoc, updateDoc, arrayUnion, setDoc, DocumentReference, collection, getDocs, query, where, arrayRemove } from "firebase/firestore";
import axios from 'axios';
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { FileUpload } from "@/components/ui/file-upload";
import { Checkbox } from "@/components/ui/checkbox";
import { InstallerAcceptanceSection, tierIcons } from "@/components/job/installer-acceptance-section";
import { aiAssistedBidCreation } from "@/ai/flows/ai-assisted-bid-creation";
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";


declare const cashfree: any;

function ReapplyCard({ job, user, onJobUpdate }: { job: Job, user: User, onJobUpdate: (updatedJob: Partial<Job>) => void }) {
    const [isLoading, setIsLoading] = React.useState(false);
    const { toast } = useToast();

    const handleReapply = async () => {
        setIsLoading(true);
        try {
            await axios.post('/api/reputation/deduct', {
                userId: user.id,
                points: 15,
                reason: `Re-application for Job ${job.id}`,
                jobId: job.id // This API will also handle the arrayRemove for 'disqualifiedInstallerIds'
            });

            // Client-side optimisic update for UI responsiveness
            await onJobUpdate({ disqualifiedInstallerIds: arrayRemove(user.id) as any });

            toast({
                title: "Re-application Request Sent",
                description: "15 points deducted. You are now eligible to be selected again.",
            });
        } catch (error) {
            console.error("Re-apply failed:", error);
            toast({
                title: "Error",
                description: "Failed to process re-application penalty.",
                variant: 'destructive'
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card className="border-amber-500/50 bg-amber-50/50">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                    <Hourglass className="h-5 w-5" />
                    Offer Expired
                </CardTitle>
                <CardDescription>
                    Your offer for this job expired. You can request to be re-included for consideration, but this will incur a small reputation penalty.
                </CardDescription>
            </CardHeader>
            <CardFooter>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="warning" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            <RefreshCcw className="mr-2 h-4 w-4" />
                            Request to Re-apply (-15 Points)
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Confirm Re-application Request</AlertDialogTitle>
                            <AlertDialogDescription>
                                Are you sure you want to request to be re-included? A penalty of 15 reputation points will be deducted from your profile for missing the original deadline.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleReapply} className={buttonVariants({ variant: "warning" })}>
                                Yes, Request Re-application
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </CardFooter>
        </Card>
    );
}

function FundingBreakdownDialog({ job, onConfirm, open, onOpenChange }: { job: Job, onConfirm: () => void, open: boolean, onOpenChange: (open: boolean) => void }) {
    if (!job.awardedInstaller) return null;

    // Calculate Breakdown
    const bidAmount = (job.bids.find(b => getRefId(b.installer) === getRefId(job.awardedInstaller))?.amount || 0);

    // In this model, Job Giver pays Bid Amount + Travel Tip. Platform fee is deducted from Installer.
    const subtotal = bidAmount;
    const travelTip = job.travelTip || 0;
    const total = subtotal + travelTip;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Payment Breakdown</DialogTitle>
                    <DialogDescription>Review the total amount before proceeding to payment.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Agreed Bid Amount</span>
                        <span>₹{bidAmount.toLocaleString()}</span>
                    </div>
                    {travelTip > 0 && (
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Travel Tip</span>
                            <span>₹{travelTip.toLocaleString()}</span>
                        </div>
                    )}
                    <Separator />
                    <div className="flex justify-between font-bold text-lg">
                        <span>Total Payable</span>
                        <span>₹{total.toLocaleString()}</span>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-md text-xs text-blue-700 dark:text-blue-300">
                        <ShieldCheck className="h-3 w-3 inline mr-1" />
                        Funds are held securely in escrow until you approve the work.
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={onConfirm} className="w-full sm:w-auto">
                        <Wallet className="mr-2 h-4 w-4" />
                        Confirm & Pay
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function RatingSection({ job, onJobUpdate }: { job: Job, onJobUpdate: (updatedJob: Partial<Job>) => void }) {
    const [rating, setRating] = React.useState(job.rating || 0);
    const [hoverRating, setHoverRating] = React.useState(0);
    const [review, setReview] = React.useState('');
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const { toast } = useToast();

    const handleRatingSubmit = async () => {
        if (rating === 0) {
            toast({ title: "Please select a rating", variant: "destructive" });
            return;
        }
        setIsSubmitting(true);
        await onJobUpdate({ rating, review: review || "" });
        toast({ title: "Thank you for your feedback!", description: "Your rating has been submitted." });
        setIsSubmitting(false);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Leave a Review</CardTitle>
                <CardDescription>Your feedback is important. Please rate your experience with the installer.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex justify-center space-x-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                            key={star}
                            className={cn(
                                "h-10 w-10 cursor-pointer transition-all",
                                (hoverRating >= star || rating >= star)
                                    ? "text-yellow-400 fill-yellow-400"
                                    : "text-muted-foreground"
                            )}
                            onMouseEnter={() => setHoverRating(star)}
                            onMouseLeave={() => setHoverRating(0)}
                            onClick={() => setRating(star)}
                        />
                    ))}
                </div>
                <Textarea
                    placeholder="Share details of your own experience with this installer (optional)..."
                    value={review}
                    onChange={(e) => setReview(e.target.value)}
                />
            </CardContent>
            <CardFooter>
                <Button onClick={handleRatingSubmit} disabled={isSubmitting || rating === 0}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Submit Review
                </Button>
            </CardFooter>
        </Card>
    );
}

function JobGiverConfirmationSection({ job, onJobUpdate }: { job: Job, onJobUpdate: (updatedJob: Partial<Job>) => void }) {
    const { toast } = useToast();
    const { db, storage } = useFirebase();
    const { user } = useUser();
    const router = useRouter();
    const [isLoading, setIsLoading] = React.useState(false);
    const [disputeReason, setDisputeReason] = React.useState("");
    const [disputeFiles, setDisputeFiles] = React.useState<File[]>([]);

    const handleApproveAndPay = async () => {
        setIsLoading(true);
        try {
            const q = query(collection(db, "transactions"), where("jobId", "==", job.id), where("status", "==", "Funded"));
            const querySnapshot = await getDocs(q);
            if (querySnapshot.empty) {
                throw new Error("Could not find a funded transaction for this job.");
            }
            const transactionDoc = querySnapshot.docs[0];

            await axios.post('/api/escrow/release-funds', {
                transactionId: transactionDoc.id,
            });

            await onJobUpdate({ status: 'Completed' });

            toast({
                title: "Job Approved & Payment Released!",
                description: "The payment has been released to the installer.",
                variant: 'default'
            });
        } catch (error: any) {
            console.error("Error approving job:", error);
            toast({
                title: "Error Approving Job",
                description: error.response?.data?.error || "An unexpected error occurred.",
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
            // Upload evidence
            const uploadPromises = disputeFiles.map(async (file) => {
                const storageRef = ref(storage, `disputes/${job.id}/${Date.now()}_${file.name}`);
                await uploadBytes(storageRef, file);
                const downloadURL = await getDownloadURL(storageRef);
                return { fileName: file.name, fileUrl: downloadURL, fileType: file.type };
            });
            const uploadedAttachments = await Promise.all(uploadPromises);

            const newDisputeId = `DISPUTE-${Date.now()}`;
            const awardedInstaller = job.awardedInstaller as User;
            const jobGiver = job.jobGiver as User;

            const disputeData: Omit<Dispute, 'id'> = {
                requesterId: user.id,
                category: "Job Dispute",
                title: `Dispute for Job: ${job.title}`,
                jobId: job.id,
                jobTitle: job.title,
                status: 'Open',
                reason: disputeReason,
                parties: {
                    jobGiverId: jobGiver.id || (job.jobGiver as any).id,
                    installerId: awardedInstaller.id || (job.awardedInstaller as any).id,
                },
                messages: [{
                    authorId: user.id,
                    authorRole: "Job Giver",
                    content: disputeReason,
                    timestamp: new Date(),
                    attachments: uploadedAttachments
                }],
                createdAt: new Date(),
            };

            await setDoc(doc(db, "disputes", newDisputeId), { ...disputeData, id: newDisputeId });
            await onJobUpdate({ status: 'Disputed', disputeId: newDisputeId });

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
                <div className="flex flex-col sm:flex-row gap-4">
                    <Button onClick={handleApproveAndPay} disabled={isLoading} className="flex-1" data-testid="approve-release-button">
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Approve & Release Payment
                    </Button>
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
            </CardContent>
        </Card>
    );
}

function InstallerCompletionSection({ job, user, onJobUpdate }: { job: Job, user: User, onJobUpdate: (updatedJob: Partial<Job>) => void }) {
    const { toast } = useToast();
    const { storage } = useFirebase();
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [completionFiles, setCompletionFiles] = React.useState<File[]>([]);
    const [otp, setOtp] = React.useState("");
    const [isVerifyingOtp, setIsVerifyingOtp] = React.useState(false);

    const handleCompleteJob = async () => {
        if (completionFiles.length === 0) {
            toast({
                title: "Proof of Work Required",
                description: "Please upload at least one photo or video showing the completed work.",
                variant: "destructive",
            });
            return;
        }

        if (!user.payouts?.beneficiaryId) {
            toast({
                title: "Payout Account Not Setup",
                description: "Please set up your bank account in your profile before you can complete a job.",
                variant: "destructive",
            });
            return;
        }

        setIsSubmitting(true);
        try {
            // AI Foreman: Analyze photos before saving
            // We do this in parallel with upload for efficiency, but we need the URL for Vision API
            // So we upload first.

            const uploadPromises = completionFiles.map(async file => {
                const fileRef = ref(storage, `jobs/${job.id}/completion/${Date.now()}_${file.name}`);
                await uploadBytes(fileRef, file);
                const fileUrl = await getDownloadURL(fileRef);

                let isAiVerified = false;

                // AI Foreman Check (Freemium Logic)
                // Only run if image (simple check)
                if (file.type.startsWith('image/')) {
                    try {
                        const analysis = await analyzePhoto({ imageUrl: fileUrl, jobCategory: job.jobCategory });
                        // Freemium: Only mark verified if score is high AND installer is Gold/Platinum
                        // For now, we simulate the logic: Verified if score >= 4
                        // In real logic: if (user.installerProfile?.tier === 'Gold' && analysis.score >= 4)
                        if (analysis.score >= 4) {
                            isAiVerified = true;
                        }
                    } catch (e) {
                        console.error("AI Analysis skipped", e);
                    }
                }

                return { fileName: file.name, fileUrl, fileType: file.type, isAiVerified };
            });

            const uploadedAttachments = await Promise.all(uploadPromises);

            if (otp && otp.length === 6) {
                // Instant Completion via OTP
                setIsVerifyingOtp(true);
                try {
                    await axios.post('/api/escrow/verify-otp-complete', {
                        jobId: job.id,
                        otp: otp,
                        completionAttachments: uploadedAttachments
                    });
                    toast({
                        title: "Job Completed Successfully!",
                        description: "OTP Verified. Payment has been released.",
                        variant: 'success' as any
                    });
                    // Let the real-time listener update the UI
                } catch (error: any) {
                    console.error("OTP Verification failed:", error);
                    toast({
                        title: "OTP Verification Failed",
                        description: error.response?.data?.error || "Invalid OTP or system error.",
                        variant: "destructive"
                    });
                    setIsSubmitting(false); // Stop here if OTP failed
                    setIsVerifyingOtp(false);
                    return;
                }
            } else {
                // Standard Flow: Submit for Confirmation
                const updatedJobData: Partial<Job> = {
                    status: 'Pending Confirmation',
                    attachments: arrayUnion(...uploadedAttachments) as any,
                };
                onJobUpdate(updatedJobData);

                toast({
                    title: "Submitted for Confirmation",
                    description: "Your proof of work has been sent to the Job Giver for approval.",
                    variant: 'default'
                });
            }

        } catch (error: any) {
            console.error("Error submitting for completion:", error);
            toast({
                title: "Submission Error",
                description: "An unexpected error occurred while submitting your work.",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
            setIsVerifyingOtp(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <Label>Proof of Completion</Label>
                <FileUpload onFilesChange={setCompletionFiles} maxFiles={5} />
            </div>
            <div className="space-y-2">
                <Label htmlFor="otp-input">Completion OTP (Optional)</Label>
                <Input
                    id="otp-input"
                    placeholder="Enter 6-digit OTP provided by Job Giver"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    maxLength={6}
                />
                <p className="text-xs text-muted-foreground">Entering the correct OTP will instantly release your payment.</p>
            </div>
            <div className="flex justify-end pt-4">
                <Button onClick={handleCompleteJob} disabled={completionFiles.length === 0 || isSubmitting} data-test-id="submit-for-review-button" className="w-full">
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (
                        otp ? <Zap className="mr-2 h-4 w-4 text-amber-500 fill-amber-500" /> : <Send className="mr-2 h-4 w-4" />
                    )}
                    {otp ? (isVerifyingOtp ? "Verifying..." : "Verify OTP & Complete Job") : "Submit for Review"}
                </Button>
            </div>
        </div>
    );
}

function PendingConfirmationSection({ job }: { job: Job }) {
    const { toast } = useToast();
    const canDispute = job.completionTimestamp &&
        (new Date().getTime() - toDate(job.completionTimestamp).getTime() > 72 * 60 * 60 * 1000);

    const handleReport = () => {
        // Here we would trigger a dispute or admin alert
        // For now, simulate it or use a placeholder API
        toast({
            title: "Report Submitted",
            description: "Support has been notified about the unresponsive client. We will review the case.",
        });
    };

    return (
        <Card className="bg-amber-50/50 border-amber-200">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Hourglass className="h-5 w-5 text-amber-600" />
                    Waiting for Confirmation
                </CardTitle>
                <CardDescription>
                    You have submitted the work. The Job Giver needs to approve it to release the funds.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-sm mb-4">
                    Most approvals happen within 24 hours. If the Job Giver is unresponsive for more than 3 days, you can report it.
                </p>
                {canDispute && (
                    <Button variant="destructive" onClick={handleReport}>
                        <AlertOctagon className="mr-2 h-4 w-4" />
                        Report Unresponsive Client
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}

function JobGiverOTPCard({ job }: { job: Job }) {
    const { toast } = useToast();

    const handleCopy = () => {
        if (job.completionOtp) {
            navigator.clipboard.writeText(job.completionOtp);
            toast({
                title: "OTP Copied!",
                description: "The completion OTP has been copied to your clipboard.",
            });
        }
    };

    return (
        <Card className="bg-primary/5 border-primary/20">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                    <KeyRound className="h-5 w-5 text-primary" />
                    Job Completion OTP
                </CardTitle>
                <CardDescription>
                    Once you are satisfied with the completed work, share this code with the installer. They will use it to mark the job as complete and trigger the payout from the Cashfree Marketplace Settlement account.
                </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
                <div className="flex items-center justify-center gap-4">
                    <p className="text-3xl font-bold tracking-widest text-primary font-mono bg-primary/10 px-4 py-2 rounded-lg">
                        {job.completionOtp}
                    </p>
                    <Button variant="ghost" size="icon" onClick={handleCopy}>
                        <Copy className="h-5 w-5" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

function InstallerBidSection({ job, user, onJobUpdate }: { job: Job, user: User, onJobUpdate: (updatedJob: Partial<Job>) => void }) {
    const { toast } = useToast();
    const { db } = useFirebase();
    const [isGenerating, setIsGenerating] = React.useState(false);
    const [bidProposal, setBidProposal] = React.useState("");
    const [bidAmount, setBidAmount] = React.useState("");
    const [platformSettings, setPlatformSettings] = React.useState<PlatformSettings | null>(null);

    React.useEffect(() => {
        const fetchSettings = async () => {
            if (!db) return;
            const settingsDoc = await getDoc(doc(db, "settings", "platform"));
            if (settingsDoc.exists()) {
                setPlatformSettings(settingsDoc.data() as PlatformSettings);
            }
        };
        fetchSettings();
    }, [db]);

    const installer = user.installerProfile;
    if (!installer) return null;

    const handlePlaceBid = async () => {
        console.log('JobDetailClient: handlePlaceBid called', { bidAmount, bidProposal });
        if (!bidAmount || !bidProposal) {
            toast({ title: "Missing Information", description: "Please provide both a bid amount and a proposal.", variant: "destructive" });
            return;
        }

        if (job.jobGiver.id === user.id) {
            toast({ title: "Action Not Allowed", description: "You cannot bid on your own job.", variant: "destructive" });
            return;
        }
        const newBid: Omit<Bid, 'id'> = {
            amount: Number(bidAmount),
            timestamp: new Date(),
            coverLetter: bidProposal,
            installer: doc(db, 'users', user.id)
        };

        let updatePayload: Partial<Job> = {
            bids: arrayUnion(newBid) as any,
            bidderIds: arrayUnion(user.id) as any,
        };

        if (job.directAwardInstallerId === user.id) {
            updatePayload.status = 'Bidding Closed';
        }

        try {
            console.log("Placing bid with payload:", updatePayload);
            await onJobUpdate(updatePayload);
            console.log("Bid updated in Firestore");
            toast({ title: "Bid Placed!", description: "Your bid has been submitted successfully." });
        } catch (error) {
            console.error("Error placing bid:", error);
            toast({ title: "Submission Failed", description: "There was an error submitting your bid. Please try again.", variant: "destructive" });
        }
    };

    const handleGenerateBid = async () => {
        setIsGenerating(true);
        try {
            const result = await aiAssistedBidCreation({
                jobDescription: job.description,
                installerSkills: installer.skills.join(', '),
                installerExperience: `${installer.reviews} jobs completed with a ${installer.rating} rating.`,
            });
            if (result.bidProposal) {
                setBidProposal(result.bidProposal);
                toast({
                    title: "Bid Proposal Generated!",
                    description: "Review the AI-generated proposal and place your bid.",
                });
            }
        } catch (error) {
            console.error("Error generating bid proposal:", error);
            toast({
                title: "Generation Failed",
                description: "There was an error generating the bid. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsGenerating(false);
        }
    };

    const commissionRate = platformSettings?.installerCommissionRate ?? 10; // Default to 10% if loading
    const earnings = Number(bidAmount) * (1 - commissionRate / 100) + (job.travelTip || 0);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Place Your Bid</CardTitle>
                <CardDescription>
                    Submit your best offer for this project.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                    <div className="space-y-2">
                        <Label htmlFor="bid-amount">Your Bid Amount (₹)</Label>
                        <Input
                            id="bid-amount"
                            name="bidAmount"
                            type="number"
                            placeholder="e.g. 15000"
                            value={bidAmount}
                            onChange={(e) => setBidAmount(e.target.value)}
                        />
                    </div>
                    {bidAmount && platformSettings && (
                        <Card className="bg-muted/50 p-3">
                            <CardDescription className="text-xs mb-1">Estimated Earnings</CardDescription>
                            <p className="text-sm">
                                <span className="font-semibold">{Number(bidAmount).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</span> (Your Bid)
                            </p>
                            <p className="text-sm">
                                - <span className="font-semibold">{(Number(bidAmount) * (commissionRate / 100)).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</span> (Platform Fee at {commissionRate}%)
                            </p>
                            {job.travelTip && job.travelTip > 0 && (
                                <p className="text-sm">
                                    + <span className="font-semibold">{(job.travelTip).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</span> (Travel Tip)
                                </p>
                            )}
                            <Separator className="my-1" />
                            <p className="font-bold text-base text-green-600">
                                ~ {earnings.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                            </p>
                        </Card>
                    )}
                </div>
                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <label className="text-sm font-medium">Cover Letter / Proposal</label>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleGenerateBid}
                            disabled={isGenerating}
                        >
                            {isGenerating ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Zap className="mr-2 h-4 w-4" />
                            )}
                            AI Bid Assistant
                        </Button>
                    </div>
                    <Textarea
                        name="coverLetter"
                        placeholder="Explain why you're the best fit for this job..."
                        className="min-h-32"
                        value={bidProposal}
                        onChange={(e) => setBidProposal(e.target.value)}
                    />
                </div>
            </CardContent>
            <CardFooter>
                <Button onClick={handlePlaceBid} className="w-full md:w-auto">Submit Bid</Button>
            </CardFooter>
        </Card>
    );
}

function JobGiverBid({ bid, job, anonymousId, selected, onSelect, rank, isSequentiallySelected, isTopRec, isBestValue, redFlag, isFavorite, isBlocked, isPreviouslyHired }: { bid: Bid, job: Job, anonymousId: string, selected: boolean, onSelect: (id: string) => void, rank?: number, isSequentiallySelected?: boolean, isTopRec?: boolean, isBestValue?: boolean, redFlag?: { concern: string } | null, isFavorite?: boolean, isBlocked?: boolean, isPreviouslyHired?: boolean }) {
    const { role, isAdmin } = useUser();
    const [timeAgo, setTimeAgo] = React.useState('');
    const installer = bid.installer as User;

    React.useEffect(() => {
        if (bid.timestamp) {
            setTimeAgo(formatDistanceToNow(toDate(bid.timestamp), { addSuffix: true }));
        }
    }, [bid.timestamp]);

    const identitiesRevealed = (job.status !== 'Open for Bidding' && job.status !== 'Bidding Closed') || isAdmin || role === 'Support Team';

    const installerName = identitiesRevealed ? installer.name : anonymousId;
    const avatar = identitiesRevealed ? <AvatarImage src={installer.realAvatarUrl} alt={installer.name} /> : <AnimatedAvatar svg={installer.avatarUrl} />;
    const avatarFallback = identitiesRevealed ? installer.name.substring(0, 2) : anonymousId.split('-')[1];

    const cardClasses = cn(
        "relative p-4 rounded-lg border flex gap-4 transition-all",
        selected && 'border-primary bg-primary/5',
        isSequentiallySelected && 'ring-2 ring-primary',
        isTopRec && 'border-primary',
        isBestValue && 'border-green-500',
        redFlag && 'border-destructive'
    );

    return (
        <div className={cardClasses}>
            {isSequentiallySelected && rank && (
                <div className="absolute -top-3 -left-3 h-7 w-7 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">{rank}</div>
            )}
            <div className="flex-1">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                        <Avatar>
                            {avatar}
                            <AvatarFallback>{avatarFallback}</AvatarFallback>
                        </Avatar>
                        <div>
                            <div className="flex items-center gap-2">
                                {identitiesRevealed ? (
                                    <Link href={`/dashboard/users/${installer.id}`} className="font-semibold hover:underline">{installerName}</Link>
                                ) : (
                                    <p className="font-semibold">{installerName}</p>
                                )}
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    {installer.installerProfile?.tier && tierIcons[installer.installerProfile.tier]}
                                    <span>{installer.installerProfile?.tier} Tier</span>
                                </div>
                            </div>
                            <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
                                <span className="flex items-center gap-1"><Star className="h-3 w-3 fill-primary text-primary" /> {installer.installerProfile?.rating} ({installer.installerProfile?.reviews} reviews)</span>
                            </div>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-lg font-bold">₹{bid.amount.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">{timeAgo}</p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 my-2">
                    {isPreviouslyHired && <Badge variant="secondary" className="gap-1.5 pl-2 border-primary/50 text-primary bg-primary/10"><CheckCircle2 className="h-3.5 w-3.5" />Previously Hired</Badge>}
                    {isFavorite && <Badge variant="default" className="gap-1.5 pl-2"><Heart className="h-3.5 w-3.5" />Your Favorite</Badge>}
                    {isBlocked && <Badge variant="destructive" className="gap-1.5 pl-2"><UserX className="h-3.5 w-3.5" />You Blocked</Badge>}
                    {isTopRec && <Badge variant="outline"><Trophy className="h-4 w-4 mr-2" /> Top Recommendation</Badge>}
                    {isBestValue && <Badge variant="success"><Lightbulb className="h-4 w-4 mr-2" /> Best Value</Badge>}
                    {redFlag && (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Badge variant="destructive"><AlertOctagon className="h-4 w-4 mr-2" /> Red Flag</Badge>
                                </TooltipTrigger>
                                <TooltipContent><p>{redFlag.concern}</p></TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}
                </div>

                <p className="mt-4 text-sm text-foreground">{bid.coverLetter}</p>
            </div>
        </div>
    );
}

function BidsSection({ job, onJobUpdate, anonymousIdMap }: { job: Job, onJobUpdate: (updatedJob: Partial<Job>) => void, anonymousIdMap: Map<string, string> }) {
    const { user, isAdmin, role } = useUser();
    const { db } = useFirebase();
    const { toast } = useToast();
    const router = useRouter();

    const [awardStrategy, setAwardStrategy] = React.useState<'simultaneous' | 'sequential'>('simultaneous');
    const [selectedInstallers, setSelectedInstallers] = React.useState<string[]>([]);
    const [responseDeadline, setResponseDeadline] = React.useState(24);
    const [showAdvanced, setShowAdvanced] = React.useState(false);

    const [isSendingOffers, setIsSendingOffers] = React.useState(false);
    const [isAnalyzing, setIsAnalyzing] = React.useState(false);
    const [analysisResult, setAnalysisResult] = React.useState<AnalyzeBidsOutput | null>(null);
    const [previouslyHiredIds, setPreviouslyHiredIds] = React.useState<Set<string>>(new Set());

    const isSubscribed = user?.subscription && toDate(user.subscription.expiresAt) > new Date();

    React.useEffect(() => {
        const fetchHistory = async () => {
            if (!user || role !== 'Job Giver' || !db) return;
            // Fetch past jobs where this user was the job giver and the job is completed
            const q = query(
                collection(db, 'jobs'),
                where('jobGiverId', '==', user.id),
                where('status', '==', 'Completed')
            );
            const snaps = await getDocs(q);
            const hires = new Set<string>();
            snaps.forEach(doc => {
                const data = doc.data();
                const installerId = getRefId(data.awardedInstaller);
                if (installerId) hires.add(installerId);
            });
            setPreviouslyHiredIds(hires);
        };
        fetchHistory();
    }, [user, role, db]);

    React.useEffect(() => {
        setSelectedInstallers([]);
    }, [awardStrategy]);

    const handleSelectInstaller = (id: string) => {
        if (awardStrategy === 'simultaneous') {
            setSelectedInstallers(prev => {
                if (prev.includes(id)) {
                    return prev.filter(i => i !== id);
                }
                if (prev.length < 3) {
                    return [...prev, id];
                }
                toast({
                    title: "Selection Limit Reached",
                    description: "You can select a maximum of 3 installers to send offers to.",
                    variant: "destructive"
                });
                return prev;
            });
        } else { // sequential
            setSelectedInstallers(prev => {
                if (prev.includes(id)) {
                    return prev.filter(i => i !== id);
                }
                if (prev.length < 3) {
                    return [...prev, id];
                }
                toast({
                    title: "Ranking Limit Reached",
                    description: "You can rank a maximum of 3 installers.",
                    variant: "destructive"
                });
                return prev;
            });
        }
    }


    const handleAnalyzeBids = async () => {
        if (!isSubscribed) {
            router.push(`/dashboard/billing?redirectUrl=/dashboard/jobs/${job.id}`);
            return;
        }

        setIsAnalyzing(true);
        try {
            if (!user) throw new Error("User not found");
            const bidderProfiles = job.bids.map(bid => {
                const installer = bid.installer as User;
                return {
                    anonymousId: anonymousIdMap.get(installer.id) || 'Unknown Bidder',
                    bidAmount: bid.amount,
                    tier: installer.installerProfile?.tier || 'Bronze',
                    rating: installer.installerProfile?.rating || 0,
                    reviewCount: installer.installerProfile?.reviews || 0,
                    isFavorite: user.favoriteInstallerIds?.includes(installer.id),
                    isBlocked: user.blockedInstallerIds?.includes(installer.id),
                };
            });

            const result = await analyzeBidsFlow({
                jobTitle: job.title,
                jobDescription: job.description,
                bidders: bidderProfiles,
            });
            setAnalysisResult(result);
        } catch (error) {
            console.error("Error analyzing bids:", error);
            toast({ title: "Analysis Failed", description: "Could not get AI-powered analysis. Please try again.", variant: "destructive" });
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleCloseBidding = async () => {
        setIsSendingOffers(true);
        try {
            await onJobUpdate({ status: "Bidding Closed" });
            toast({
                title: "Bidding Closed",
                description: "No more bids can be placed. You can now select and award an installer.",
            });
        } catch (error) {
            console.error("Error closing bidding:", error);
            toast({
                title: "Error",
                description: "Failed to close bidding. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsSendingOffers(false);
        }
    };

    const handleSendOffers = async () => {
        if (selectedInstallers.length === 0) {
            toast({ title: "No Installers Selected", description: "Please select at least one installer to send an offer." });
            return;
        }
        setIsSendingOffers(true);
        const acceptanceDeadline = new Date();
        acceptanceDeadline.setHours(acceptanceDeadline.getHours() + responseDeadline);

        const update: Partial<Job> = {
            status: "Awarded",
            selectedInstallers: selectedInstallers.map((id, index) => ({
                installerId: id,
                rank: awardStrategy === 'sequential' ? index + 1 : 1
            })),
            acceptanceDeadline,
        };

        if (awardStrategy === 'sequential') {
            update.awardedInstaller = doc(db, 'users', selectedInstallers[0]);
        }

        await onJobUpdate(update);
        toast({
            title: "Offers Sent!",
            description: awardStrategy === 'simultaneous'
                ? `Offers sent to ${selectedInstallers.length} installer(s). First to accept wins.`
                : `Offer sent to your #1 ranked installer. They have ${responseDeadline} hours to respond.`,
        });
        setIsSendingOffers(false);
    };

    const sortedBids = React.useMemo(() => {
        if (!job.bids) return [];
        let bids = [...job.bids];

        if (analysisResult) {
            const topRecId = Array.from(anonymousIdMap.entries()).find(([, value]) => value === analysisResult.topRecommendation.anonymousId)?.[0];
            const bestValueId = Array.from(anonymousIdMap.entries()).find(([, value]) => value === analysisResult.bestValue.anonymousId)?.[0];
            const redFlagIds = new Set(analysisResult.redFlags.map(f => Array.from(anonymousIdMap.entries()).find(([, value]) => value === f.anonymousId)?.[0]));

            bids.sort((a, b) => {
                const aId = (a.installer as User).id;
                const bId = (b.installer as User).id;

                const isARedFlag = redFlagIds.has(aId);
                const isBRedFlag = redFlagIds.has(bId);
                if (isARedFlag && !isBRedFlag) return 1;
                if (!isARedFlag && isBRedFlag) return -1;

                const isATop = aId === topRecId;
                const isBTop = bId === topRecId;
                if (isATop && !isBTop) return -1;
                if (!isATop && isBTop) return 1;

                const isABest = aId === bestValueId;
                const isBBest = bId === bestValueId;
                if (isABest && !isBBest) return -1;
                if (!isABest && isBBest) return 1;

                return b.amount - a.amount;
            });
        } else {
            bids.sort((a, b) => b.amount - a.amount);
        }

        return bids;
    }, [job.bids, analysisResult, anonymousIdMap]);

    const isJobAwarded = !!job.awardedInstaller;

    const AnalyzeButton = () => {
        if (!isSubscribed) {
            return (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="outline" onClick={() => router.push(`/dashboard/billing?redirectUrl=/dashboard/jobs/${job.id}`)}>
                                <Zap className="mr-2 h-4 w-4 text-amber-500" />
                                Analyze Bids with AI
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Upgrade to a premium plan to use this feature.</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )
        }

        return (
            <Dialog>
                <DialogTrigger asChild>
                    <Button variant="outline" onClick={handleAnalyzeBids} disabled={isAnalyzing}>
                        {isAnalyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BrainCircuit className="mr-2 h-4 w-4" />}
                        Analyze Bids with AI
                    </Button>
                </DialogTrigger>
                {analysisResult && (
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>AI Bid Analysis</DialogTitle>
                            <DialogDescription>{analysisResult.summary}</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
                            <div className="p-4 rounded-lg border border-primary/50 bg-primary/5">
                                <h3 className="font-semibold flex items-center gap-2"><Trophy className="h-5 w-5 text-primary" /> Top Recommendation: {analysisResult.topRecommendation.anonymousId}</h3>
                                <p className="text-sm text-muted-foreground mt-1">{analysisResult.topRecommendation.reasoning}</p>
                            </div>
                            <div className="p-4 rounded-lg border border-green-500/50 bg-green-500/5">
                                <h3 className="font-semibold flex items-center gap-2"><Lightbulb className="h-5 w-5 text-green-600" /> Best Value: {analysisResult.bestValue.anonymousId}</h3>
                                <p className="text-sm text-muted-foreground mt-1">{analysisResult.bestValue.reasoning}</p>
                            </div>
                            {analysisResult.redFlags.length > 0 && (
                                <div className="p-4 rounded-lg border border-destructive/50 bg-destructive/5">
                                    <h3 className="font-semibold flex items-center gap-2"><AlertOctagon className="h-5 w-5 text-destructive" /> Potential Red Flags</h3>
                                    <ul className="mt-2 space-y-2">
                                        {analysisResult.redFlags.map(flag => (
                                            <li key={flag.anonymousId} className="text-sm text-muted-foreground">
                                                <strong className="text-foreground">{flag.anonymousId}:</strong> {flag.concern}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </DialogContent>
                )}
            </Dialog>
        )
    }

    return (
        <Card id="bids-section">
            <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <CardTitle>Received Bids ({job.bids?.length || 0})</CardTitle>
                        <CardDescription>
                            Review bids and select an installer.
                        </CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {job.bids && job.bids.length > 1 && job.status === 'Bidding Closed' && (
                            <AnalyzeButton />
                        )}
                        {job.status === 'Open for Bidding' && (
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="default" disabled={job.bids.length === 0}>
                                        <Clock className="mr-2 h-4 w-4" />
                                        Close Bidding
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Close Bidding Early?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            You have received {job.bids.length} bid(s). Once you close bidding, no more installers can place bids. You'll then be able to select and award the job.
                                            <br /><br />
                                            This action cannot be undone.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleCloseBidding}>
                                            Close Bidding
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        )}
                        {job.status === 'Bidding Closed' && (
                            <Button onClick={handleSendOffers} disabled={isSendingOffers || selectedInstallers.length === 0}>
                                {isSendingOffers && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Send Offer(s)
                            </Button>
                        )}
                    </div>
                </div>
                {(job.status === 'Open for Bidding' || job.status === 'Bidding Closed') && (
                    <div className="pt-4 space-y-4">
                        <div>
                            <Label>Award Strategy</Label>
                            <RadioGroup value={awardStrategy} onValueChange={(v) => setAwardStrategy(v as any)} className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <RadioGroupItem value="simultaneous" id="simultaneous" className="peer sr-only" />
                                    <Label htmlFor="simultaneous" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                                        <h4 className="font-semibold">Simultaneous</h4>
                                        <p className="text-xs text-center text-muted-foreground">Offer to all selected (up to 3). First to accept wins.</p>
                                    </Label>
                                </div>
                                <div>
                                    <RadioGroupItem value="sequential" id="sequential" className="peer sr-only" />
                                    <Label htmlFor="sequential" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                                        <h4 className="font-semibold">Sequential (Ranked)</h4>
                                        <p className="text-xs text-center text-muted-foreground">Offer to installers one by one based on your ranking.</p>
                                    </Label>
                                </div>
                            </RadioGroup>
                            <p className="text-sm text-muted-foreground mt-2">
                                {awardStrategy === 'simultaneous' ? 'Click on bids below to select them.' : 'Click on bids below to rank them (1st, 2nd, 3rd).'}
                            </p>
                        </div>
                        <div className="pt-2">
                            <button onClick={() => setShowAdvanced(!showAdvanced)} className="text-sm font-medium text-primary hover:underline">
                                Advanced Options
                            </button>
                            {showAdvanced && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2 p-4 border rounded-lg">
                                    <div className="space-y-2">
                                        <Label>Response Time</Label>
                                        <Select value={String(responseDeadline)} onValueChange={(v) => setResponseDeadline(Number(v))}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="12">12 Hours</SelectItem>
                                                <SelectItem value="24">24 Hours (Default)</SelectItem>
                                                <SelectItem value="48">48 Hours</SelectItem>
                                                <SelectItem value="72">72 Hours</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </CardHeader>
            <CardContent className="space-y-4">
                {sortedBids.map((bid) => {
                    const installerId = (bid.installer as User).id;
                    const rank = awardStrategy === 'sequential' ? selectedInstallers.indexOf(installerId) + 1 : undefined;

                    let recommendationProps = {};
                    if (analysisResult) {
                        const anonymousId = anonymousIdMap.get(installerId);
                        recommendationProps = {
                            isTopRec: anonymousId === analysisResult.topRecommendation.anonymousId,
                            isBestValue: anonymousId === analysisResult.bestValue.anonymousId,
                            redFlag: analysisResult.redFlags.find(f => f.anonymousId === anonymousId) || null,
                        };
                    }

                    return (
                        <div key={installerId} onClick={() => (job.status === 'Open for Bidding' || job.status === 'Bidding Closed') && handleSelectInstaller(installerId)} className={cn((job.status === 'Open for Bidding' || job.status === 'Bidding Closed') && "cursor-pointer")}>
                            <JobGiverBid
                                bid={bid}
                                job={job}
                                anonymousId={anonymousIdMap.get(installerId) || `Bidder-?`}
                                selected={selectedInstallers.includes(installerId)}
                                onSelect={handleSelectInstaller}
                                isSequentiallySelected={awardStrategy === 'sequential' && selectedInstallers.includes(installerId)}
                                rank={rank && rank > 0 ? rank : undefined}
                                isFavorite={user?.favoriteInstallerIds?.includes(installerId)}
                                isBlocked={user?.blockedInstallerIds?.includes(installerId)}
                                isPreviouslyHired={previouslyHiredIds.has(installerId)}
                                {...recommendationProps}
                            />
                        </div>
                    )
                })}
            </CardContent>
        </Card>
    );
}

function PageSkeleton() {
    return (
        <div className="grid gap-8 md:grid-cols-3">
            <div className="md:col-span-2 grid gap-8">
                <Card>
                    <CardHeader>
                        <Skeleton className="h-8 w-1/4" />
                        <Skeleton className="h-6 w-3/4" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-20 w-full" />
                        <Separator className="my-6" />
                        <Skeleton className="h-8 w-1/3 mb-4" />
                        <div className="space-y-6">
                            <div className="flex gap-3">
                                <Skeleton className="h-9 w-9 rounded-full" />
                                <div className="flex-1 space-y-2">
                                    <Skeleton className="h-4 w-1/2" />
                                    <Skeleton className="h-4 w-full" />
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <Skeleton className="h-9 w-9 rounded-full" />
                                <div className="flex-1 space-y-2">
                                    <Skeleton className="h-4 w-1/2" />
                                    <Skeleton className="h-4 w-full" />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
            <div className="space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Job Overview</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function FinancialsCard({ job, transaction, platformSettings, user }: { job: Job, transaction: Transaction | null, platformSettings: PlatformSettings | null, user: User }) {
    if (job.status !== 'Completed' || !transaction) {
        return null;
    }

    const isInstaller = user.roles.includes('Installer');
    const isJobGiver = user.roles.includes('Job Giver');

    const installer = job.awardedInstaller as User;
    const jobGiver = job.jobGiver as User;

    const commission = transaction.commission;
    const gstOnCommission = commission * 0.18;
    const jobGiverFee = transaction.jobGiverFee;
    const gstOnJobGiverFee = jobGiverFee * 0.18;

    const InvoiceDialog = ({ isForInstaller }: { isForInstaller: boolean }) => (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Platform Service Fee Invoice</DialogTitle>
                <DialogDescription>
                    This invoice is for the service fee paid to the platform for this job.
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 text-sm">
                <p><strong>Billed To:</strong> {isForInstaller ? installer.name : jobGiver.name}</p>
                <p><strong>From:</strong> CCTV Job Connect</p>
                <Separator />
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Platform Service Fee for Job #{job.id}</span>
                    <span>₹{(isForInstaller ? commission : jobGiverFee).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground">GST @ 18%</span>
                    <span>₹{(isForInstaller ? gstOnCommission : gstOnJobGiverFee).toLocaleString('en-IN')}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold">
                    <span>Total</span>
                    <span>₹{(isForInstaller ? (commission + gstOnCommission) : (jobGiverFee + gstOnJobGiverFee)).toLocaleString('en-IN')}</span>
                </div>
            </div>
        </DialogContent>
    );

    return (
        <Card className="bg-gradient-to-br from-blue-50/20 to-purple-50/20 dark:from-blue-950/20 dark:to-purple-950/20">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                    <Award className="h-5 w-5 text-primary" />
                    Financial Summary
                </CardTitle>
                <CardDescription>A summary of the financial transactions for this completed job.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Final Payout to Installer</span>
                    <span className="font-semibold text-green-600">₹{transaction.payoutToInstaller.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Platform Fee (from Installer)</span>
                    <span className="font-semibold text-red-600">- ₹{transaction.commission.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Platform Fee (from Job Giver)</span>
                    <span className="font-semibold text-red-600">- ₹{transaction.jobGiverFee.toLocaleString('en-IN')}</span>
                </div>
                <Separator />
                <div className="space-y-2">
                    {isInstaller && (
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="link" className="p-0 h-auto text-sm">View My Commission Invoice</Button>
                            </DialogTrigger>
                            <InvoiceDialog isForInstaller={true} />
                        </Dialog>
                    )}
                    {isJobGiver && (
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="link" className="p-0 h-auto text-sm">View My Platform Fee Invoice</Button>
                            </DialogTrigger>
                            <InvoiceDialog isForInstaller={false} />
                        </Dialog>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}

function CommentDisplay({ comment, authorName, authorAvatar }: { comment: Comment, authorName: string, authorAvatar?: string }) {
    const [timeAgo, setTimeAgo] = React.useState('');
    const author = comment.author as User;

    React.useEffect(() => {
        if (comment.timestamp) {
            setTimeAgo(formatDistanceToNow(toDate(comment.timestamp), { addSuffix: true }));
        }
    }, [comment.timestamp]);

    return (
        <div key={comment.id} className="flex gap-3">
            <Avatar className="h-9 w-9">
                <AnimatedAvatar svg={authorAvatar || author.avatarUrl} />
                <AvatarFallback>{authorName.substring(0, 2)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm">{authorName}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">{timeAgo}</p>
                </div>
                <div className="text-sm mt-1 text-foreground">{comment.content}</div>
            </div>
        </div>
    );
}

function EditDateDialog({ job, user, onJobUpdate, triggerElement }: { job: Job; user: User; onJobUpdate: (updatedPart: Partial<Job>) => void; triggerElement: React.ReactNode }) {
    const { toast } = useToast();
    const [newDate, setNewDate] = React.useState<string>(job.jobStartDate ? format(toDate(job.jobStartDate), "yyyy-MM-dd") : "");
    const [isOpen, setIsOpen] = React.useState(false);
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const handleSave = async () => {
        if (newDate && job) {
            setIsSubmitting(true);
            const proposal = {
                newDate: new Date(newDate),
                proposedBy: (user.roles.includes('Job Giver') ? 'Job Giver' : 'Installer') as 'Job Giver' | 'Installer',
                status: 'pending' as const
            };
            await onJobUpdate({ dateChangeProposal: proposal });
            toast({
                title: "Date Change Proposed",
                description: `A request to change the start date to ${format(new Date(newDate), "MMM d, yyyy")} has been sent.`,
            });
            setIsSubmitting(false);
            setIsOpen(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>{triggerElement}</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Propose New Job Start Date</DialogTitle>
                    <DialogDescription>
                        Select a new start date for this job. The other party will need to approve this change.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="job-start-date">New Start Date</Label>
                        <Input
                            id="job-start-date"
                            type="date"
                            value={newDate}
                            onChange={(e) => setNewDate(e.target.value)}
                            min={format(new Date(), "yyyy-MM-dd")}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button onClick={handleSave} disabled={!newDate || isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Propose Change
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function DateChangeProposalSection({ job, user, onJobUpdate }: { job: Job, user: User, onJobUpdate: (updatedJob: Partial<Job>) => void }) {
    if (!job.dateChangeProposal || job.dateChangeProposal.status !== 'pending') {
        return null;
    }

    const { toast } = useToast();
    const isProposer = job.dateChangeProposal.proposedBy === user.roles[0]; // Simplified role check

    const handleAccept = () => {
        onJobUpdate({
            jobStartDate: job.dateChangeProposal!.newDate,
            dateChangeProposal: undefined, // Clear proposal
        });
        toast({ title: 'Date Change Accepted', description: 'The job start date has been updated.' });
    };

    const handleDecline = () => {
        onJobUpdate({ dateChangeProposal: undefined }); // Clear proposal, date remains unchanged
        toast({ title: 'Date Change Declined', description: 'The job start date remains unchanged.', variant: 'destructive' });
    };

    return (
        <Card className="border-amber-500/50 bg-amber-50/50">
            <CardHeader>
                <CardTitle>Date Change Proposed</CardTitle>
                <CardDescription>
                    {isProposer
                        ? `You have proposed a new start date of ${format(toDate(job.dateChangeProposal.newDate), "MMM d, yyyy")}. Awaiting response.`
                        : `${job.dateChangeProposal.proposedBy} has requested to change the job start date to ${format(toDate(job.dateChangeProposal.newDate), "MMM d, yyyy")}.`
                    }
                </CardDescription>
            </CardHeader>
            {!isProposer && (
                <CardFooter className="flex justify-end gap-2">
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive">Decline</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will decline the proposed date change. The original start date will be kept.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDecline} className={cn(buttonVariants({ variant: 'destructive' }))}>
                                    Confirm Decline
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button>Accept</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Accept Date Change?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will officially change the job start date to {format(toDate(job.dateChangeProposal.newDate), "PPP")}. Are you sure?
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleAccept}>
                                    Yes, Accept
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </CardFooter>
            )}
        </Card>
    );
}

function AdditionalTasksSection({ job, user, onJobUpdate }: { job: Job, user: User, onJobUpdate: (updatedJob: Partial<Job>) => void }) {
    const isInstaller = user.roles.includes('Installer');
    const isJobGiver = user.roles.includes('Job Giver');
    const [openTaskDialog, setOpenTaskDialog] = React.useState(false);
    const [openQuoteDialog, setOpenQuoteDialog] = React.useState<string | null>(null);
    const [newTaskDescription, setNewTaskDescription] = React.useState("");
    const [quoteAmount, setQuoteAmount] = React.useState<number | "">("");
    const [quoteDetails, setQuoteDetails] = React.useState("");
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const { toast } = useToast();

    const handleAddTask = () => {
        if (!newTaskDescription.trim()) return;

        const newTask: AdditionalTask = {
            id: `TASK-${Date.now()}`,
            description: newTaskDescription,
            status: 'pending-quote',
            createdBy: isJobGiver ? 'Job Giver' : 'Installer',
            createdAt: new Date(),
        };

        const updatedTasks = [...(job.additionalTasks || []), newTask];
        onJobUpdate({ additionalTasks: updatedTasks });
        setNewTaskDescription("");
        setOpenTaskDialog(false);
    };

    const handleSubmitQuote = (taskId: string) => {
        if (quoteAmount === "" || quoteAmount <= 0) return;

        const updatedTasks = (job.additionalTasks || []).map(task => {
            if (task.id === taskId) {
                return { ...task, status: 'quoted' as const, quoteAmount: Number(quoteAmount), quoteDetails };
            }
            return task;
        });

        onJobUpdate({ additionalTasks: updatedTasks });
        setQuoteAmount("");
        setQuoteDetails("");
        setOpenQuoteDialog(null);
    };

    const handleApproveQuote = async (taskId: string) => {
        setIsSubmitting(true);
        try {
            // 1. Initiate Payment Session for Additional Task
            const response = await axios.post('/api/escrow/initiate-payment', {
                jobId: job.id,
                jobGiverId: user.id,
                taskId: taskId
            });

            const { payment_session_id } = response.data;

            if (!payment_session_id) throw new Error("Failed to create payment session.");

            // 2. Checkout using global cashfree object
            const cf = new cashfree(payment_session_id);
            cf.checkout({
                redirectTarget: "_self",
            });

        } catch (error: any) {
            console.error("Error initiating task payment:", error);
            toast({
                title: "Payment Initialization Failed",
                description: error.response?.data?.error || "Could not start payment session.",
                variant: "destructive"
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeclineQuote = (taskId: string) => {
        const updatedTasks = (job.additionalTasks || []).map(task =>
            task.id === taskId ? { ...task, status: 'declined' as const } : task
        );
        onJobUpdate({ additionalTasks: updatedTasks });
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Additional Tasks</CardTitle>
                    <CardDescription>Manage changes to the job scope.</CardDescription>
                </div>
                <Dialog open={openTaskDialog} onOpenChange={setOpenTaskDialog}>
                    <DialogTrigger asChild>
                        <Button variant="outline" size="sm"><Plus className="mr-2 h-4 w-4" /> Add Task</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add an Additional Task</DialogTitle>
                            <DialogDescription>Describe the new work required. The other party will be prompted to provide or approve a quote.</DialogDescription>
                        </DialogHeader>
                        <div className="py-4 space-y-2">
                            <Label htmlFor="task-desc">Task Description</Label>
                            <Textarea id="task-desc" value={newTaskDescription} onChange={(e) => setNewTaskDescription(e.target.value)} placeholder="e.g., Install one more camera in the back office." />
                        </div>
                        <DialogFooter>
                            <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
                            <Button onClick={handleAddTask} disabled={!newTaskDescription.trim()}>Add Task</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
                {(job.additionalTasks || []).length > 0 ? (
                    <div className="space-y-4">
                        {(job.additionalTasks || []).map(task => (
                            <div key={task.id} className="p-4 border rounded-lg space-y-3">
                                <p className="font-semibold">{task.description}</p>
                                <div className="text-xs text-muted-foreground">Requested by {task.createdBy} on {format(toDate(task.createdAt), "PP")}</div>

                                {task.status === 'pending-quote' && (
                                    isInstaller ? (
                                        <Dialog open={openQuoteDialog === task.id} onOpenChange={(isOpen) => !isOpen && setOpenQuoteDialog(null)}>
                                            <DialogTrigger asChild>
                                                <Button size="sm" onClick={() => setOpenQuoteDialog(task.id)}>Submit Quote</Button>
                                            </DialogTrigger>
                                            <DialogContent>
                                                <DialogHeader>
                                                    <DialogTitle>Submit Quote for Additional Task</DialogTitle>
                                                    <DialogDescription>{task.description}</DialogDescription>
                                                </DialogHeader>
                                                <div className="py-4 space-y-4">
                                                    <div className="space-y-2">
                                                        <Label htmlFor="quote-amount">Quote Amount (₹)</Label>
                                                        <Input id="quote-amount" type="number" value={quoteAmount} onChange={e => setQuoteAmount(Number(e.target.value))} />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="quote-details">Details (Optional)</Label>
                                                        <Textarea id="quote-details" value={quoteDetails} onChange={e => setQuoteDetails(e.target.value)} placeholder="e.g., Includes cost of camera and extra cabling." />
                                                    </div>
                                                </div>
                                                <DialogFooter>
                                                    <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
                                                    <Button onClick={() => handleSubmitQuote(task.id)}>Submit Quote</Button>
                                                </DialogFooter>
                                            </DialogContent>
                                        </Dialog>
                                    ) : <Badge variant="outline">Awaiting Quote from Installer</Badge>
                                )}

                                {task.status === 'quoted' && (
                                    <Card className="bg-secondary/50 p-4">
                                        <CardHeader className="p-0 pb-2">
                                            <CardTitle className="text-base">Quote Received</CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-0 space-y-2">
                                            <p className="text-2xl font-bold">₹{task.quoteAmount?.toLocaleString()}</p>
                                            {task.quoteDetails && <p className="text-sm text-muted-foreground italic">"{task.quoteDetails}"</p>}
                                            {isJobGiver && (
                                                <div className="flex gap-2 pt-2">
                                                    <Button size="sm" onClick={() => handleApproveQuote(task.id)}>Approve & Pay</Button>
                                                    <Button size="sm" variant="destructive" onClick={() => handleDeclineQuote(task.id)}>Decline</Button>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                )}

                                {task.status === 'approved' && <Badge variant="success">Approved</Badge>}
                                {task.status === 'declined' && <Badge variant="destructive">Declined</Badge>}
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No additional tasks have been added.</p>
                )}
            </CardContent>
        </Card>
    );
}


const getRefId = (ref: any): string | null => {
    if (!ref) return null;
    if (typeof ref === 'string') return ref;
    return ref.id || null;
}

export default function JobDetailClient() {
    const { user, role, isAdmin } = useUser();
    const { db, storage } = useFirebase();
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();
    const id = params.id as string;
    const { toast } = useToast();

    const [job, setJob] = React.useState<Job | null>(null);
    const [transaction, setTransaction] = React.useState<Transaction | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [platformSettings, setPlatformSettings] = React.useState<PlatformSettings | null>(null);
    const [isFunding, setIsFunding] = React.useState(false);
    const [showFundingDialog, setShowFundingDialog] = React.useState(false);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [isFunded, setIsFunded] = React.useState(false);

    const [newComment, setNewComment] = React.useState("");

    const [newPrivateMessage, setNewPrivateMessage] = React.useState("");
    const [newPrivateMessageAttachments, setNewPrivateMessageAttachments] = React.useState<File[]>([]);
    const [isSendingMessage, setIsSendingMessage] = React.useState(false);

    const [deadlineRelative, setDeadlineRelative] = React.useState('');
    const [deadlineAbsolute, setDeadlineAbsolute] = React.useState('');

    const fetchJob = React.useCallback(async () => {
        if (!db || !id) return;
        setLoading(true);

        const settingsDoc = await getDoc(doc(db, "settings", "platform"));
        if (settingsDoc.exists()) {
            setPlatformSettings(settingsDoc.data() as PlatformSettings);
        }

        const transQuery = query(collection(db, "transactions"), where("jobId", "==", id), where("status", "==", "Funded"));
        const transSnap = await getDocs(transQuery);
        setIsFunded(!transSnap.empty);
        if (!transSnap.empty) {
            setTransaction(transSnap.docs[0].data() as Transaction);
        }

        let jobData: Job;
        try {
            const { data } = await axios.post('/api/jobs/public', { jobId: id, userId: user?.id });
            jobData = data.job;
        } catch (error) {
            console.error("Failed to fetch job", error);
            setJob(null);
            setLoading(false);
            return;
        }

        const userIds = new Set<string>();
        const jobGiverId = getRefId(jobData.jobGiver);
        if (jobGiverId) userIds.add(jobGiverId);

        const awardedInstallerId = getRefId(jobData.awardedInstaller);
        if (awardedInstallerId) userIds.add(awardedInstallerId);

        (jobData.selectedInstallers || []).forEach(s => userIds.add(s.installerId));

        (jobData.bids || []).forEach(bid => {
            const installerId = getRefId(bid.installer);
            if (installerId) userIds.add(installerId);
        });

        (jobData.comments || []).forEach(comment => {
            const authorId = getRefId(comment.author);
            if (authorId) userIds.add(authorId);
        });

        (jobData.privateMessages || []).forEach(msg => {
            const authorId = getRefId(msg.author);
            if (authorId) userIds.add(authorId);
        });

        const usersMap = new Map<string, User>();
        if (userIds.size > 0) {
            const usersQuery = query(collection(db, 'users'), where('__name__', 'in', Array.from(userIds)));
            const userDocs = await getDocs(usersQuery);
            userDocs.forEach(docSnap => {
                if (docSnap.exists()) {
                    usersMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() } as User);
                }
            });
        }

        const populatedJob: Job = {
            ...jobData,
            jobGiver: (jobGiverId ? usersMap.get(jobGiverId) : null) || jobData.jobGiver,
            awardedInstaller: awardedInstallerId ? (usersMap.get(awardedInstallerId) || jobData.awardedInstaller) : undefined,
            bids: (jobData.bids || []).map(bid => {
                const installerId = getRefId(bid.installer);
                const installer = installerId ? usersMap.get(installerId) : null;
                return { ...bid, installer: installer || bid.installer };
            }) as Bid[],
            comments: (jobData.comments || []).map(comment => {
                const authorId = getRefId(comment.author);
                const author = authorId ? usersMap.get(authorId) : null;
                return { ...comment, author: author || comment.author };
            }) as Comment[],
            privateMessages: (jobData.privateMessages || []).map(msg => {
                const authorId = getRefId(msg.author);
                const author = authorId ? usersMap.get(authorId) : null;
                return { ...msg, author: author || msg.author };
            }) as PrivateMessage[],
        };

        setJob(populatedJob);
        setLoading(false);
    }, [id, db, user?.id]);

    React.useEffect(() => {
        fetchJob();
    }, [fetchJob]);

    React.useEffect(() => {
        const paymentStatus = searchParams.get('payment_status');
        const orderId = searchParams.get('order_id');

        if (paymentStatus && orderId) {
            if (paymentStatus === 'success') {
                toast({
                    title: "Payment Successful!",
                    description: "The job is now in progress.",
                    variant: "default",
                });
                fetchJob();
            } else if (paymentStatus === 'failure') {
                toast({
                    title: "Payment Failed",
                    description: "The payment could not be completed. Please try again.",
                    variant: "destructive",
                });
            }
            window.history.replaceState(null, '', `/dashboard/jobs/${id}`);
        }
    }, [searchParams, id, toast, fetchJob]);

    const jobStartDate = React.useMemo(() => {
        if (job?.jobStartDate) {
            return format(toDate(job.jobStartDate), "MMM d, yyyy");
        }
        return 'Not set';
    }, [job?.jobStartDate]);

    const anonymousIdMap = React.useMemo(() => {
        if (!job) return new Map<string, string>();

        const jobGiverId = getRefId(job.jobGiver);

        const bidderIdsFromBids = (job.bids || []).map(b => getRefId(b.installer)).filter(Boolean) as string[];
        const bidderIdsFromComments = (job.comments || [])
            .map(c => getRefId(c.author))
            .filter(id => id && id !== jobGiverId) as string[];

        const uniqueBidderIds = [...new Set([...bidderIdsFromBids, ...bidderIdsFromComments])];

        const idMap = new Map<string, string>();
        let counter = 1;
        uniqueBidderIds.forEach(id => {
            idMap.set(id, `Bidder-${counter++}`);
        });
        return idMap;

    }, [job]);


    React.useEffect(() => {
        if (job) {
            setDeadlineRelative(formatDistanceToNow(toDate(job.deadline), { addSuffix: true }));
            setDeadlineAbsolute(format(toDate(job.deadline), "MMM d, yyyy"));

            // Sequential Award Escalation Logic
            const checkEscalation = async () => {
                if (
                    job.status === 'Awarded' &&
                    job.acceptanceDeadline &&
                    job.selectedInstallers &&
                    job.selectedInstallers.length > 0 &&
                    user &&
                    getRefId(job.jobGiver) === user.id
                ) {
                    const now = new Date();
                    const deadline = toDate(job.acceptanceDeadline);

                    if (now > deadline) {
                        const currentInstallerId = getRefId(job.awardedInstaller);
                        const currentSelection = job.selectedInstallers.find(s => s.installerId === currentInstallerId);

                        // Only proceed if we are in a sequential flow (ranks exist)
                        if (currentSelection && currentSelection.rank > 0) {
                            const nextRank = currentSelection.rank + 1;
                            const nextInstaller = job.selectedInstallers.find(s => s.rank === nextRank);

                            if (nextInstaller) {
                                console.log("Escalating to next ranked installer:", nextInstaller.installerId);
                                const nextDeadline = new Date();
                                nextDeadline.setHours(nextDeadline.getHours() + 24); // Give 24 hours to next

                                const jobRef = doc(db, 'jobs', job.id);
                                await updateDoc(jobRef, {
                                    awardedInstaller: doc(db, 'users', nextInstaller.installerId),
                                    acceptanceDeadline: nextDeadline
                                });

                                toast({
                                    title: "Award Escalated",
                                    description: "Previous installer missed the deadline. Offer sent to the next ranked installer.",
                                });
                                fetchJob();
                            } else {
                                // No more installers. 
                                // Optionally close job? For now, do nothing or notify.
                            }
                        }
                    }
                }
            };
            checkEscalation();
        }
    }, [job, user, db, toast, fetchJob]);

    const handleJobUpdate = React.useCallback(async (updatedPart: Partial<Job>) => {
        if (!job || !db) return;

        try {
            const jobRef = doc(db, 'jobs', job.id);
            await updateDoc(jobRef, updatedPart);
            await fetchJob();
        } catch (error) {
            console.error("Error updating job:", error);
            throw error; // Re-throw so callers can handle it
        }
    }, [job, db, fetchJob]);

    const handlePostComment = async () => {
        if (!newComment.trim() || !user || !job) return;

        const validation = validateMessageContent(newComment);
        if (!validation.isValid) {
            toast({
                title: "Comment Blocked",
                description: validation.reason,
                variant: "destructive",
            });
            return;
        }

        const newCommentObject: Omit<Comment, 'id'> = {
            author: doc(db, 'users', user.id),
            timestamp: new Date(),
            content: newComment,
        };

        await handleJobUpdate({ comments: arrayUnion(newCommentObject) as any });

        setNewComment("");
        toast({
            title: "Comment Posted!",
        });
    };

    const handlePostPrivateMessage = async () => {
        if ((!newPrivateMessage.trim() && newPrivateMessageAttachments.length === 0) || !user || !job || !storage) return;

        const validation = validateMessageContent(newPrivateMessage);
        if (!validation.isValid) {
            toast({
                title: "Message Blocked",
                description: validation.reason,
                variant: "destructive",
            });
            return;
        }

        setIsSendingMessage(true);
        let isFlagged = false;
        let flagReason = "";

        // AI Moderation (Sentinel)
        if (newPrivateMessage.length > 5) {
            try {
                const moderation = await moderateMessage({ message: newPrivateMessage });
                if (moderation.isFlagged) {
                    isFlagged = true;
                    flagReason = moderation.reason || "Safety Violation";
                    toast({
                        title: "Safety Warning",
                        description: "Your message was flagged by our safety AI. It has been sent but marked for review.",
                        variant: "destructive",
                    });
                }
            } catch (err) {
                console.error("Moderation failed", err);
            }
        }

        const uploadPromises = newPrivateMessageAttachments.map(async file => {
            const fileRef = ref(storage, `jobs/${job.id}/private_messages/${Date.now()}_${file.name}`);
            await uploadBytes(fileRef, file);
            const fileUrl = await getDownloadURL(fileRef);
            return { fileName: file.name, fileUrl, fileType: file.type };
        });

        const uploadedAttachments = await Promise.all(uploadPromises);

        const newMessageObject: PrivateMessage & { isFlagged?: boolean; flagReason?: string } = {
            id: `MSG-${Date.now()}`,
            author: doc(db, 'users', user.id),
            timestamp: new Date(),
            content: newPrivateMessage,
            attachments: uploadedAttachments,
            isFlagged,
            flagReason
        };

        await handleJobUpdate({
            privateMessages: arrayUnion(newMessageObject) as any,
        });

        setNewPrivateMessage("");
        setNewPrivateMessageAttachments([]);
        setIsSendingMessage(false);
        if (!isFlagged) {
            toast({
                title: "Message Sent!",
            });
        }
    };

    const handleCancelJob = async () => {
        if (!job || !user) return;
        setIsSubmitting(true);
        try {
            const { data } = await axios.post('/api/escrow/refund', {
                jobId: job.id,
                userId: user.id
            });

            if (data.success) {
                toast({
                    title: "Job Cancelled",
                    description: data.message || "Job cancelled and refund initiated.",
                });
                // Real-time listener will update status
            }
        } catch (error: any) {
            console.error("Cancellation failed:", error);
            toast({
                title: "Cancellation Failed",
                description: error.response?.data?.error || "Could not cancel job.",
                variant: "destructive"
            });
        } finally {
            setIsSubmitting(false);
        }
    }

    const handleFundJobClick = () => {
        setShowFundingDialog(true);
    };

    const handleConfirmFunding = async () => {
        setShowFundingDialog(false);
        if (!db || !user || !job || !job.awardedInstaller) return;
        setIsFunding(true);

        try {
            const { data } = await axios.post('/api/escrow/initiate-payment', {
                jobId: job.id,
                jobTitle: job.title,
                jobGiverId: user.id,
                installerId: getRefId(job.awardedInstaller),
                amount: (job.bids.find(b => getRefId(b.installer) === getRefId(job.awardedInstaller))?.amount || 0),
                travelTip: job.travelTip || 0
            });

            if (!data.payment_session_id) throw new Error("Could not retrieve payment session ID.");

            const cashfreeInstance = new cashfree(data.payment_session_id);
            cashfreeInstance.checkout({
                payment_method: "upi",
                onComplete: async () => {
                    const installer = job.awardedInstaller as User;
                    const billingSnapshot = {
                        installerName: installer.name,
                        installerAddress: installer.address,
                        gstin: installer.gstin,
                        pan: installer.panNumber // Use panNumber from User type
                    };
                    await handleJobUpdate({
                        status: 'In Progress',
                        billingSnapshot
                    });
                }
            });

        } catch (error: any) {
            toast({
                title: "Failed to Initiate Payment",
                description: error.response?.data?.error || "An unexpected error occurred. Please try again.",
                variant: "destructive"
            });
        } finally {
            setIsFunding(false);
        }
    };

    const handleAttachmentDelete = async (attachmentToDelete: JobAttachment) => {
        if (!job || !storage) return;

        try {
            const fileRef = ref(storage, attachmentToDelete.fileUrl);

            await deleteObject(fileRef);

            await handleJobUpdate({
                attachments: arrayRemove(attachmentToDelete) as any
            });

            toast({
                title: "Attachment Deleted",
                description: `Successfully deleted ${attachmentToDelete.fileName}.`,
                variant: "default",
            });
        } catch (error: any) {
            console.error("Error deleting attachment:", error);
            if (error.code === 'storage/object-not-found') {
                await handleJobUpdate({
                    attachments: arrayRemove(attachmentToDelete) as any
                });
                toast({ title: "Attachment Removed", description: "The attachment reference was removed, though the file was not found in storage.", variant: "default" });
            } else {
                toast({
                    title: "Error Deleting Attachment",
                    description: "An unexpected error occurred. Please try again.",
                    variant: "destructive",
                });
            }
        }
    };

    const handleReportAbandonment = async (reason: string, files: File[]) => {
        if (!user || !job || !job.awardedInstaller || !storage) return;

        // Upload evidence
        const uploadPromises = files.map(async (file) => {
            const storageRef = ref(storage, `disputes/${job.id}/${Date.now()}_${file.name}`);
            await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(storageRef);
            return { fileName: file.name, fileUrl: downloadURL, fileType: file.type };
        });
        const uploadedAttachments = await Promise.all(uploadPromises);

        const newDisputeId = `DISPUTE-ABANDON-${Date.now()}`;
        const awardedInstaller = job.awardedInstaller as User;
        const jobGiver = job.jobGiver as User;

        const disputeData: Omit<Dispute, 'id'> = {
            requesterId: user.id,
            category: "Job Dispute",
            title: `Installer Unresponsive for Job: ${job.title}`,
            jobId: job.id,
            jobTitle: job.title,
            status: 'Open',
            reason: reason,
            parties: {
                jobGiverId: jobGiver.id,
                installerId: awardedInstaller.id,
            },
            messages: [{
                authorId: user.id,
                authorRole: "Job Giver",
                content: reason,
                timestamp: new Date(),
                attachments: uploadedAttachments
            }],
            createdAt: new Date(),
        };

        await setDoc(doc(db, "disputes", newDisputeId), { ...disputeData, id: newDisputeId });
        await handleJobUpdate({ status: 'Disputed', disputeId: newDisputeId });

        toast({
            title: "Dispute Created",
            description: "An admin will review the case shortly. You have been redirected to the dispute page.",
        });

        router.push(`/dashboard/disputes/${newDisputeId}`);
    };


    if (loading) {
        return <PageSkeleton />;
    }

    if (!job || !user || !storage) {
        console.log('JobDetailClient: Missing job/user/storage', { job: !!job, user: !!user, storage: !!storage });
        notFound();
    }


    const awardedInstallerId = getRefId(job.awardedInstaller);
    const isSelectedInstaller = role === "Installer" && (job.selectedInstallers || []).some(s => s.installerId === user.id);
    const isAwardedInstaller = role === "Installer" && user.id === awardedInstallerId;
    const isDisqualified = role === "Installer" && (job.disqualifiedInstallerIds || []).includes(user.id);
    const canReapply = isDisqualified && job.status === "Bidding Closed";
    const isPrivateBidder = role === "Installer" && user.id === job.directAwardInstallerId && job.bids.length === 0;
    const jobGiver = job.jobGiver as User;
    const isJobGiver = role === "Job Giver" && user.id === job.jobGiverId;

    const canEditJob = isJobGiver && job.status === 'Open for Bidding';
    const canCancelJob = isJobGiver && (job.status === 'In Progress' || job.status === 'Open for Bidding' || job.status === 'Bidding Closed');
    const canReportAbandonment = isJobGiver && job.status === 'In Progress' && isFunded;

    const identitiesRevealed = (job.status !== 'Open for Bidding' && job.status !== 'Bidding Closed') || isAdmin || role === 'Support Team';
    const showJobGiverRealIdentity = identitiesRevealed;

    const canPostPublicComment = job.status === 'Open for Bidding' && (role === 'Installer' || isJobGiver || isAdmin || role === 'Support Team') && !job.directAwardInstallerId;
    const communicationMode: 'public' | 'private' | 'none' =
        (job.status === 'In Progress' || job.status === 'Completed' || job.status === 'Disputed' || job.status === 'Pending Confirmation') && (isJobGiver || isAwardedInstaller || isAdmin || role === 'Support Team')
            ? 'private'
            : (job.status === 'Open for Bidding' && !job.directAwardInstallerId)
                ? 'public'
                : 'none';

    const showInstallerAcceptance = isSelectedInstaller && job.status === 'Awarded';
    const canProposeDateChange = (isJobGiver || isAwardedInstaller) && job.status === 'In Progress' && !job.dateChangeProposal;


    return (
        <div className="grid gap-8 md:grid-cols-3">
            <div className="md:col-span-2 grid gap-8">
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <Badge variant={getStatusVariant(job.status)}>{job.status}</Badge>
                                    {role === 'Installer' && job.status === 'Open for Bidding' && !isJobGiver && !(job.bidderIds || []).includes(user.id) && (
                                        <Button variant="outline" size="sm" className="h-7" onClick={() => document.getElementById('bid-section')?.scrollIntoView({ behavior: 'smooth' })}>
                                            <Zap className="mr-1 h-3 w-3" />
                                            Place Bid
                                        </Button>
                                    )}
                                </div>
                                <CardTitle className="text-2xl">{job.title}</CardTitle>
                                <CardDescription className="font-mono text-sm pt-1">{job.id}</CardDescription>
                            </div>
                            <div className="flex items-center gap-3">
                                <Avatar>
                                    {showJobGiverRealIdentity ? <AvatarImage src={(jobGiver as User)?.realAvatarUrl} /> : <AnimatedAvatar svg={(jobGiver as User)?.avatarUrl} />}
                                    <AvatarFallback>{(jobGiver?.name || 'JG').substring(0, 2)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="text-sm font-semibold">{showJobGiverRealIdentity ? (jobGiver?.name || 'Job Giver') : 'Job Giver'}</p>
                                    {showJobGiverRealIdentity && <p className="text-xs text-muted-foreground font-mono">{jobGiver.id || (jobGiver as any)?.id}</p>}
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {(isJobGiver || role === 'Admin') && job.priceEstimate && (
                            <div className="mb-6 p-4 rounded-lg bg-muted/50 border border-muted flex items-center gap-3">
                                <TrendingUp className="h-5 w-5 text-green-600" />
                                <div>
                                    <p className="text-sm text-muted-foreground font-medium">AI Price Estimate (Private)</p>
                                    <p className="font-semibold text-lg">₹{job.priceEstimate.min.toLocaleString()} - ₹{job.priceEstimate.max.toLocaleString()}</p>
                                </div>
                            </div>
                        )}
                        <p className="text-foreground whitespace-pre-wrap">{job.description}</p>

                        {job.status === 'Pending Funding' && isJobGiver && (
                            <>
                                <Separator className="my-6" />
                                <Card className="bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
                                    <CardHeader>
                                        <CardTitle>Action Required: Fund Project</CardTitle>
                                        <CardDescription>The installer has accepted your offer. Please complete the payment to secure the service and start the work.</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <Button onClick={handleFundJobClick} disabled={isFunding}>
                                            {isFunding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            <Wallet className="mr-2 h-4 w-4" />
                                            Proceed to Payment
                                        </Button>
                                    </CardContent>
                                    <FundingBreakdownDialog
                                        job={job}
                                        open={showFundingDialog}
                                        onOpenChange={setShowFundingDialog}
                                        onConfirm={handleConfirmFunding}
                                    />
                                </Card>
                            </>
                        )}

                        {job.status === 'Pending Confirmation' && isJobGiver && (
                            <>
                                <Separator className="my-6" />
                                <JobGiverConfirmationSection job={job} onJobUpdate={handleJobUpdate} />
                            </>
                        )}

                        {job.dateChangeProposal && job.status === 'In Progress' && (
                            <>
                                <Separator className="my-6" />
                                <DateChangeProposalSection job={job} user={user} onJobUpdate={handleJobUpdate} />
                            </>
                        )}

                        {job.attachments && job.attachments.length > 0 && (
                            <>
                                <Separator className="my-6" />
                                <div>
                                    <h3 className="font-semibold mb-4">Attachments</h3>
                                    <div className="space-y-2">
                                        {job.attachments.map((file, idx) => (
                                            <div key={idx} className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <a
                                                        href={file.fileUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center gap-2 text-primary hover:underline bg-primary/10 p-2 rounded-md transition-colors hover:bg-primary/20"
                                                    >
                                                        <FileIcon className="h-4 w-4" />
                                                        <span className="text-sm font-medium">{file.fileName}</span>
                                                    </a>
                                                    {(file as any).isAiVerified && (
                                                        <div className="flex items-center gap-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-1 rounded-full text-xs font-semibold border border-green-200 dark:border-green-800">
                                                            <Sparkles className="h-3 w-3" />
                                                            AI Verified
                                                        </div>
                                                    )}
                                                </div>
                                                {canEditJob && (
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10">
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                                <AlertDialogDescription>This will permanently delete the attachment "{file.fileName}". This action cannot be undone.</AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => handleAttachmentDelete(file)} className={cn(buttonVariants({ variant: "destructive" }))}>
                                                                    Delete
                                                                </AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}

                        {showInstallerAcceptance && (
                            <>
                                <Separator className="my-6" />
                                <InstallerAcceptanceSection job={job} onJobUpdate={handleJobUpdate} />
                            </>
                        )}

                        {canReapply && (
                            <>
                                <Separator className="my-6" />
                                <ReapplyCard job={job} user={user} onJobUpdate={handleJobUpdate} />
                            </>
                        )}


                        {communicationMode === 'private' && (
                            <>
                                {(job.comments || []).length > 0 && (
                                    <>
                                        <Separator className="my-6" />
                                        <h3 className="font-semibold mb-4 flex items-center gap-2 text-muted-foreground">
                                            <Archive className="h-5 w-5" /> Archived Public Q&A
                                        </h3>
                                        <div className="space-y-6 rounded-lg border p-4 bg-muted/50">
                                            {(job.comments || []).map((comment) => {
                                                const author = comment.author as User;
                                                const authorId = author.id;
                                                let authorName = anonymousIdMap.get(authorId) || `Bidder-?`;
                                                let authorAvatar = author.avatarUrl;
                                                if (authorId === jobGiver.id) {
                                                    authorName = "Job Giver";
                                                    authorAvatar = jobGiver.avatarUrl;
                                                } else if (identitiesRevealed && authorId === awardedInstallerId) {
                                                    authorName = (job.awardedInstaller as User)?.name || "Unknown";
                                                    authorAvatar = (job.awardedInstaller as User)?.realAvatarUrl || "";
                                                }

                                                return <CommentDisplay key={comment.id || authorId + comment.timestamp} comment={comment} authorName={authorName} authorAvatar={authorAvatar} />;
                                            })}
                                        </div>
                                    </>
                                )}

                                <Separator className="my-6" />
                                <h3 className="font-semibold mb-4 flex items-center gap-2">
                                    <Lock className="h-5 w-5" /> Private Messages
                                </h3>
                                <div className="space-y-6">
                                    {(job.privateMessages || []).map((message, idx) => {
                                        const author = message.author as User;
                                        const timeAgo = formatDistanceToNow(toDate(message.timestamp), { addSuffix: true });

                                        return (
                                            <div key={idx} className="flex gap-3">
                                                <Avatar className="h-9 w-9">
                                                    <AvatarImage src={author.realAvatarUrl} />
                                                    <AvatarFallback>{author.name.substring(0, 2)}</AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1">
                                                    <div className="flex justify-between items-center">
                                                        <p className="font-semibold text-sm">{author.name}</p>
                                                        <p className="text-xs text-muted-foreground">{timeAgo}</p>
                                                    </div>
                                                    <div className="text-sm mt-1 text-foreground bg-accent/30 p-3 rounded-lg space-y-3">
                                                        {message.content && <p>{message.content}</p>}
                                                        {(message as any).isFlagged && (
                                                            <div className="mt-2 text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-2 rounded flex items-center gap-2">
                                                                <ShieldAlert className="h-4 w-4" />
                                                                <span>Warning: This message was flagged by AI as potentially unsafe ({(message as any).flagReason || 'Suspicious Content'}). Be cautious.</span>
                                                            </div>
                                                        )}
                                                        {message.attachments && message.attachments.length > 0 && (
                                                            <div>
                                                                <p className="font-semibold text-xs mb-2">Attachments:</p>
                                                                <div className="space-y-2">
                                                                    {message.attachments.map((file, fileIdx) => (
                                                                        <a
                                                                            key={fileIdx}
                                                                            href={file.fileUrl}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="flex items-center gap-2 text-primary hover:underline bg-primary/10 p-2 rounded-md text-xs"
                                                                        >
                                                                            <FileIcon className="h-4 w-4" />
                                                                            <span>{file.fileName}</span>
                                                                        </a>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                    <div className="flex gap-3">
                                        <Avatar className="h-9 w-9">
                                            <AvatarImage src={user.realAvatarUrl} />
                                            <AvatarFallback>{user?.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 space-y-2">
                                            <Textarea
                                                placeholder="Send a private message..."
                                                value={newPrivateMessage}
                                                onChange={(e) => setNewPrivateMessage(e.target.value)}
                                            />
                                            <div className="flex justify-between items-center">
                                                <FileUpload onFilesChange={setNewPrivateMessageAttachments} maxFiles={3} />
                                                <Button size="sm" onClick={handlePostPrivateMessage} disabled={isSendingMessage || (!newPrivateMessage.trim() && newPrivateMessageAttachments.length === 0)}>
                                                    {isSendingMessage && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                    <Send className="mr-2 h-4 w-4" />
                                                    Send
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {communicationMode === 'public' && (
                            <>
                                <Separator className="my-6" />
                                <h3 className="font-semibold mb-4">Public Q&A ({job.comments?.length || 0})</h3>
                                <div className="space-y-6">
                                    {(job.comments || []).map((comment) => {
                                        const author = comment.author as User;
                                        const authorId = author.id;
                                        let authorName: string;
                                        let authorAvatar: string | undefined;

                                        if (authorId === jobGiver.id) {
                                            authorName = "Job Giver";
                                            authorAvatar = jobGiver.avatarUrl;
                                        } else {
                                            authorName = anonymousIdMap.get(authorId) || `Bidder-?`;
                                            authorAvatar = author.avatarUrl;
                                        }

                                        return <CommentDisplay key={comment.id || authorId + comment.timestamp} comment={comment} authorName={authorName} authorAvatar={authorAvatar} />;
                                    })}
                                    {canPostPublicComment && (
                                        <div className="flex gap-3">
                                            <Avatar className="h-9 w-9">
                                                <AnimatedAvatar svg={user?.avatarUrl} />
                                                <AvatarFallback>{user?.name.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 space-y-2">
                                                <Textarea
                                                    placeholder="Ask a public question about the job..."
                                                    value={newComment}
                                                    onChange={(e) => setNewComment(e.target.value)}
                                                />
                                                <div className="flex justify-end">
                                                    <Button size="sm" onClick={handlePostComment} disabled={!newComment.trim()}>Post Comment</Button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}

                        {(job.status === 'In Progress') && isAwardedInstaller && (
                            <>
                                <Separator className="my-6" />
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <Button className="w-full" size="lg">
                                            <CheckCircle2 className="mr-2 h-5 w-5" />
                                            Submit Work for Completion
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-2xl">
                                        <DialogHeader>
                                            <DialogTitle>Submit Work for Completion</DialogTitle>
                                            <DialogDescription>
                                                Upload proof of completion. If the Job Giver provided a Completion OTP, enter it below for instant payment release. Otherwise, submit for manual review.
                                            </DialogDescription>
                                        </DialogHeader>
                                        <InstallerCompletionSection job={job} user={user} onJobUpdate={handleJobUpdate} />
                                    </DialogContent>
                                </Dialog>
                            </>
                        )}

                        {job.status === 'Completed' && (
                            <>
                                <Separator className="my-6" />
                                {isJobGiver && !job.rating ? (
                                    <RatingSection job={job} onJobUpdate={handleJobUpdate} />
                                ) : (
                                    <FinancialsCard job={job} transaction={transaction} platformSettings={platformSettings} user={user} />
                                )}
                            </>
                        )}
                    </CardContent>
                </Card>

                {(isAdmin || role === 'Support Team' || (isJobGiver && (['Open for Bidding', 'Bidding Closed'].includes(job.status) || (job.status === 'Awarded' && !isSelectedInstaller)))) && (job.bids || []).length > 0 && <BidsSection job={job} onJobUpdate={handleJobUpdate} anonymousIdMap={anonymousIdMap} />}

                {(isPrivateBidder || (role === "Installer" && job.status === "Open for Bidding" && !isJobGiver && !(job.bidderIds || []).includes(user.id))) && (
                    <div id="bid-section">
                        <InstallerBidSection job={job} user={user} onJobUpdate={handleJobUpdate} />
                    </div>
                )}

                {job.status === 'In Progress' && (isJobGiver || isAwardedInstaller) && (
                    <AdditionalTasksSection job={job} user={user} onJobUpdate={handleJobUpdate} />
                )}

            </div>

            <div className="space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Job Overview</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm text-foreground">
                        <div className="flex items-start gap-3">
                            <MapPin className="h-5 w-5 mt-1" />
                            <div>
                                <p className="text-muted-foreground">Location</p>
                                {role === 'Admin' && job.fullAddress ? (
                                    <Link
                                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.fullAddress)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="font-semibold hover:underline"
                                    >
                                        {job.fullAddress}
                                    </Link>
                                ) : (
                                    <p className="font-semibold">{job.location}</p>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Clock className="h-5 w-5" />
                            <div>
                                <p className="text-muted-foreground">Bidding Ends</p>
                                <p className="font-semibold">{deadlineRelative} ({deadlineAbsolute})</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Calendar className="h-5 w-5" />
                            <div className="flex-1">
                                <p className="text-muted-foreground">Work Starts</p>
                                <p className="font-semibold">{jobStartDate}</p>
                            </div>
                            {canProposeDateChange && (
                                <EditDateDialog
                                    job={job}
                                    user={user}
                                    onJobUpdate={handleJobUpdate}
                                    triggerElement={
                                        <Button variant="ghost" size="icon">
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                    }
                                />
                            )}
                        </div>
                        {role === 'Admin' ? (
                            <Link href="#bids-section" className="flex items-center gap-3 cursor-pointer">
                                <Users className="h-5 w-5" />
                                <div>
                                    <p className="text-muted-foreground">Bids</p>
                                    <p className="font-semibold hover:underline">{job.bids?.length || 0} Received</p>
                                </div>
                            </Link>
                        ) : (
                            <div className="flex items-center gap-3">
                                <Users className="h-5 w-5" />
                                <div>
                                    <p className="text-muted-foreground">Bids</p>
                                    <p className="font-semibold">{job.bids?.length || 0} Received</p>
                                </div>
                            </div>
                        )}
                        <div className="flex items-center gap-3">
                            <MessageSquare className="h-5 w-5" />
                            <div>
                                <p className="text-muted-foreground">Public Q&A</p>
                                <p className="font-semibold">{job.comments?.length || 0}</p>
                            </div>
                        </div>
                        {job.isGstInvoiceRequired && (
                            <div className="flex items-center gap-3">
                                <FileText className="h-5 w-5" />
                                <div>
                                    <p className="text-muted-foreground">Invoice</p>
                                    <p className="font-semibold">GST Invoice Required</p>
                                </div>
                            </div>
                        )}
                        {(isJobGiver || role === 'Admin') && job.priceEstimate && (
                            <div className="flex items-center gap-3">
                                <TrendingUp className="h-5 w-5 text-green-600" />
                                <div>
                                    <p className="text-muted-foreground">AI Price Estimate (Private)</p>
                                    <p className="font-semibold">₹{job.priceEstimate.min.toLocaleString()} - ₹{job.priceEstimate.max.toLocaleString()}</p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                    <CardContent className="pt-6 border-t">
                        <div className="space-y-2">
                            {canEditJob && (
                                <Button asChild className="w-full" variant="secondary">
                                    <Link href={`/dashboard/post-job?editJobId=${job.id}`}>
                                        <Edit className="mr-2 h-4 w-4" />
                                        Edit Job
                                    </Link>
                                </Button>
                            )}
                            {job.status === 'Completed' && job.invoice && (
                                <Button asChild className="w-full">
                                    <Link href={`/dashboard/jobs/${job.id}/invoice`}>
                                        <FileText className="mr-2 h-4 w-4" />
                                        View Invoice
                                    </Link>
                                </Button>
                            )}
                            {canReportAbandonment && (
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <Button variant="destructive" className="w-full">
                                            <AlertOctagon className="mr-2 h-4 w-4" />
                                            Report: Installer Not Responding
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Report Installer Not Responding</DialogTitle>
                                            <DialogDescription>
                                                This will immediately pause the project and create a dispute ticket for admin review. You must provide evidence of your attempts to contact them.
                                            </DialogDescription>
                                        </DialogHeader>
                                        <div className="space-y-4 py-4">
                                            <div className="space-y-2">
                                                <Label>Reason / Details</Label>
                                                <Textarea
                                                    placeholder="Describe your attempts to contact the installer..."
                                                    id="abandonment-reason"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Evidence (Screenshots/Logs)</Label>
                                                <FileUpload onFilesChange={(files) => (window as any).tempAbandonmentFiles = files} maxFiles={3} />
                                            </div>
                                        </div>
                                        <DialogFooter>
                                            <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
                                            <Button variant="destructive" onClick={() => {
                                                const reason = (document.getElementById('abandonment-reason') as HTMLTextAreaElement).value;
                                                const files = (window as any).tempAbandonmentFiles || [];
                                                if (!reason || files.length === 0) {
                                                    toast({ title: "Evidence Required", description: "Please provide a reason and upload evidence.", variant: "destructive" });
                                                    return;
                                                }
                                                handleReportAbandonment(reason, files);
                                            }}>Confirm & Create Dispute</Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            )}
                            {canCancelJob && (
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="destructive" className="w-full">
                                            <Ban className="mr-2 h-4 w-4" />
                                            Cancel Job
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Are you sure you want to cancel this job?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This action cannot be undone.
                                                {job.status === 'In Progress' && isFunded && " The funds are held securely. You must contact support through the dispute system to process a refund."}
                                                {job.status === 'In Progress' && !isFunded && " This will terminate the contract with the current installer. No reputation will be lost."}
                                                {job.status !== 'In Progress' && " The job will be marked as 'Cancelled' and will no longer be open for bidding."}
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Back</AlertDialogCancel>
                                            <AlertDialogAction onClick={handleCancelJob} className={cn(buttonVariants({ variant: "destructive" }))}>Confirm Cancellation</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            )}
                        </div>
                    </CardContent>
                </Card>

            </div>
        </div >
    );
}
