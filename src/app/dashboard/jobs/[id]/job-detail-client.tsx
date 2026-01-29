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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

import { getAuth } from "firebase/auth";
import { DocumentReference, doc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { useJobSubscription } from "@/hooks/use-job-subscription";
import { useBidsSubscription } from "@/hooks/use-bids-subscription";
import axios from "axios";
import { updateJobAction, approveJobAction } from "@/app/actions/job.actions";
import { createPaymentOrderAction, createAddFundsOrderAction } from "@/app/actions/payment.actions";


import { moderateContentAction } from "@/app/actions/ai.actions";
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
    XCircle, // Added
    CheckCircle, // Added
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
    Phone,
    PlusCircle,
} from "lucide-react";
import { format, formatDistanceToNow, isPast } from "date-fns";
import React from "react";
import { analyzeBidsFlow, AnalyzeBidsOutput } from "@/ai/flows/analyze-bids";

import { Skeleton } from "@/components/ui/skeleton";
import { JobDetailSkeleton } from "@/components/skeletons/job-detail-skeleton";
import { Bid, Job, Comment, User, JobAttachment, PrivateMessage, Dispute, Transaction, Invoice, PlatformSettings, AdditionalTask } from "@/lib/types";
import { AnimatedAvatar } from "@/components/ui/animated-avatar";
import { getStatusVariant, toDate, cn, validateMessageContent } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import Image from "next/image";

import { createReport, ReportType } from "@/lib/services/reports";
import { sendNotification } from "@/lib/notifications";
import { useHelp } from "@/hooks/use-help";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { FileUpload } from "@/components/ui/file-upload";
import { Checkbox } from "@/components/ui/checkbox";
import { InstallerAcceptanceSection, tierIcons } from "@/components/job/installer-acceptance-section";
import { aiAssistedBidCreation } from "@/ai/flows/ai-assisted-bid-creation";
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { VariationOrderList } from "@/components/job/variation-order-list";
import { VariationOrderDialog } from "@/components/job/variation-order-dialog";
import { MilestoneList } from "@/components/milestone/milestone-list";
import { MilestoneDialog } from "@/components/milestone/milestone-dialog";
import { logActivity } from "@/lib/activity-logger";
import { PlaceBidDialog } from "@/components/job/place-bid-dialog";
import { FundingBreakdownDialog } from "@/components/job/job-funding-dialog";
import { RatingSection } from "@/components/job/job-rating-section";
import { ReapplyCard } from "@/components/job/job-reapply-card";
import { StartWorkInput } from "@/components/job/start-work-input";
import { CancelJobDialog } from "@/components/job/cancel-job-dialog";
import { InstallerCompletionSection } from "@/components/job/installer-completion-section";
import { JobGiverConfirmationSection } from "@/components/job/job-giver-confirmation-section";
import { completeJobWithOtpAction, awardJobAction } from "@/app/actions/job.actions";


declare const cashfree: any;

// Helper to safely get the string ID from a potential User object or DocumentReference or string
const getRefId = (ref: User | DocumentReference | string | undefined | null): string => {
    if (!ref) return '';
    if (typeof ref === 'string') return ref;
    if ('id' in ref) return ref.id; // It's likely a DocumentReference or User object
    return '';
};










function AddFundsDialog({ job, user, open, onOpenChange, platformSettings }: { job: Job, user: User, open: boolean, onOpenChange: (open: boolean) => void, platformSettings: PlatformSettings | null }) {
    const [amount, setAmount] = React.useState<number>(0);
    const [description, setDescription] = React.useState("");
    const [isLoading, setIsLoading] = React.useState(false);
    const { toast } = useToast();

    // Calculate Fees
    const jobGiverFeeRate = platformSettings?.jobGiverFeeRate || 2.5; // Default 2.5%
    const fee = Math.ceil(amount * (jobGiverFeeRate / 100));
    const total = amount + fee;

    const handleAddFunds = async () => {
        if (amount <= 0 || !description.trim()) {
            toast({ title: "Invalid Input", description: "Please enter amount and description.", variant: "destructive" });
            return;
        }

        setIsLoading(true);
        try {
            const res = await createAddFundsOrderAction(job.id, user.id, amount, description);

            if (!res.success || !res.data) {
                toast({ title: "Payment Initialization Failed", description: res.error, variant: "destructive" });
                return;
            }

            const { orderToken } = res.data;

            const checkoutOptions = {
                paymentSessionId: orderToken,
                redirectTarget: "_self",
            };

            // @ts-ignore
            if (window.Cashfree) {
                // @ts-ignore
                const cashfree = new window.Cashfree({ mode: "sandbox" }); // or production
                cashfree.checkout(checkoutOptions).then((result: any) => {
                    if (result.error) {
                        toast({ title: "Payment Failed", description: result.error.message, variant: "destructive" });
                    }
                    if (result.redirect) {

                    }
                });
            } else {
                toast({ title: "Error", description: "Payment Gateway not loaded.", variant: "destructive" });
            }

        } catch (error: any) {
            console.error("Add Funds Failed:", error);
            toast({ title: "Error", description: "Failed to initiate payment.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add Extra Funds</DialogTitle>
                    <DialogDescription>Add funds to the escrow for extra tasks or materials.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Amount (₹)</Label>
                        <Input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} />
                    </div>
                    <div className="space-y-2">
                        <Label>Description</Label>
                        <Input placeholder="e.g. Extra wire needed" value={description} onChange={async (e) => {
                            const val = e.target.value;
                            setDescription(val);
                            // Real-time moderation (debounced ideal, but simple here)
                            // Ideally handled on submit or blur
                        }} />
                    </div>

                    {amount > 0 && (
                        <div className="bg-muted p-3 rounded-md text-sm space-y-1">
                            <div className="flex justify-between">
                                <span>Base Amount:</span>
                                <span>₹{amount}</span>
                            </div>
                            <div className="flex justify-between text-muted-foreground">
                                <span>Processing Fee ({jobGiverFeeRate}%):</span>
                                <span>₹{fee}</span>
                            </div>
                            <Separator className="my-1" />
                            <div className="flex justify-between font-bold">
                                <span>Total Payable:</span>
                                <span>₹{total}</span>
                            </div>
                        </div>
                    )}

                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleAddFunds} disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Pay ₹{total || 0}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// External components: InstallerCompletionSection, JobGiverConfirmationSection


/* --- MAIN CLIENT COMPONENT --- */

export default function JobDetailClient({ isMapLoaded, initialJob, initialBids }: { isMapLoaded: boolean; initialJob?: any, initialBids?: any[] }) {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const { user, role, loading: userLoading, isAdmin } = useUser();
    const isInstaller = role === 'Installer';



    // const db = useFirestore(); // Legacy DB access removed

    const { toast } = useToast();

    const { job: realtimeJob, loading: jobLoading, error: jobError } = useJobSubscription(id, initialJob);
    const { bids, loading: bidsLoading } = useBidsSubscription(id, initialBids);

    // Merge initial and realtime, prefer realtime
    const job = realtimeJob || initialJob;
    const loading = jobLoading && !job;

    // Determine Winning Bid Amount (Hoisted for Payment Action)
    const winningBidAmount = React.useMemo(() => {
        if (!job?.awardedInstaller || !bids) return 0;
        const awardedId = getRefId(job.awardedInstaller);
        const winningBid = bids.find(b => getRefId(b.installer) === awardedId);
        return winningBid ? winningBid.amount : 0;
    }, [job, bids]);

    // Legacy setJob/setBids not needed except for optimism?
    // We rely on subscription updates.

    const [platformSettings, setPlatformSettings] = React.useState<PlatformSettings | null>(null);
    const [counterParty, setCounterParty] = React.useState<User | null>(null);
    const isJobGiver = !!(user && job && (user.id === getRefId(job.jobGiver) || user.id === job.jobGiverId));

    // State for Payment Dialog
    const [isPaymentDialogOpen, setIsPaymentDialogOpen] = React.useState(false);

    // State for Bid Dialog
    const [isBidDialogOpen, setIsBidDialogOpen] = React.useState(false);

    // State for Cancel Dialog
    const [isCancelDialogOpen, setIsCancelDialogOpen] = React.useState(false);
    const [isAddFundsDialogOpen, setIsAddFundsDialogOpen] = React.useState(false);

    // Reschedule Logic & Trust/Safety States (Moved up to pass Rules of Hooks)
    const [isRescheduleDialogOpen, setIsRescheduleDialogOpen] = React.useState(false);
    const [isLoading, setIsLoading] = React.useState(false);
    const [isReleaseDialogOpen, setIsReleaseDialogOpen] = React.useState(false);
    const [isDisputeDialogOpen, setIsDisputeDialogOpen] = React.useState(false);
    const [isReviewDialogOpen, setIsReviewDialogOpen] = React.useState(false);
    const [disputeReason, setDisputeReason] = React.useState('');
    const [disputeDesc, setDisputeDesc] = React.useState('');
    const [reviewRating, setReviewRating] = React.useState(5);
    const [reviewComment, setReviewComment] = React.useState('');
    const [rescheduleDate, setRescheduleDate] = React.useState<Date | undefined>(undefined);
    const [isVariationDialogOpen, setIsVariationDialogOpen] = React.useState(false);
    // DEEP DEBUG LOGGING FOR E2E
    React.useEffect(() => {
        if (job) {
            console.log('[DEBUG-E2E] Full Job State:', JSON.stringify({
                id: job.id,
                status: job.status,
                workStartedAt: job.workStartedAt,
                isJobGiver: isJobGiver,
                userId: user?.id,
                role: role,
                origin: realtimeJob ? 'realtime' : 'initial'
            }));
        }
    }, [job, user, isJobGiver, role, !!realtimeJob]);

    const [isMilestoneDialogOpen, setIsMilestoneDialogOpen] = React.useState(false);




    // --- Milestone Handlers ---
    const handleCreateMilestone = async (title: string, description: string, amount: number) => {
        if (!job || !user) return;


        try {
            const newMilestone = {
                id: `MIL-${Date.now()}`,
                title,
                description,
                amount,
                status: 'funded', // Automatically funded from main escrow budget
                createdAt: Date.now()
            };

            // Refactored to use API via handleJobUpdate
            await handleJobUpdate({
                milestones: [...(job.milestones || []), newMilestone]
            });

            toast({ title: "Milestone Created", description: "Milestone has been added to the job." });
        } catch (error) {
            console.error("Error creating milestone:", error);
            toast({ title: "Error", description: "Failed to create milestone", variant: "destructive" });
        }
    };

    const handleReleaseMilestone = async (milestoneId: string) => {
        if (!job || !user) return;

        try {
            const updatedMilestones = (job.milestones || []).map((m: any) =>
                m.id === milestoneId ? { ...m, status: 'released' } : m
            );

            await handleJobUpdate({
                milestones: updatedMilestones
            });

            toast({ title: "Payment Released", description: "Milestone payment released to installer." });
        } catch (error) {
            console.error("Error releasing milestone:", error);
            toast({ title: "Error", description: "Failed to release milestone", variant: "destructive" });
        }
    };

    const handleProposeVariation = async (description: string, amount: number) => {
        if (!job || !user) return;
        const newTask: AdditionalTask = {
            id: `TASK-${Date.now()}`,
            description,
            quoteAmount: amount,
            status: 'quoted',
            createdBy: 'Installer',
            createdAt: new Date()
        };
        await handleJobUpdate({
            additionalTasks: [...(job.additionalTasks || []), newTask]
        });
        toast({ title: "Variation Proposed", description: "Sent to Job Giver for approval." });
    };

    const handleRequestVariation = async (description: string) => {
        if (!job || !user) return;
        const newTask: AdditionalTask = {
            id: `TASK-${Date.now()}`,
            description,
            status: 'pending-quote',
            createdBy: 'Job Giver',
            createdAt: new Date()
        };
        await handleJobUpdate({
            additionalTasks: [...(job.additionalTasks || []), newTask]
        });
        toast({ title: "Variation Requested", description: "Sent to Installer for a quote." });
    };

    const handleQuoteVariation = async (task: AdditionalTask) => {
        const quote = prompt("Enter quote amount (₹):");
        if (!quote || isNaN(Number(quote))) return;

        const amount = Number(quote);
        const updatedTasks = job.additionalTasks?.map((t: AdditionalTask) => {
            if (t.id === task.id) {
                return { ...t, quoteAmount: amount, status: 'quoted' };
            }
            return t;
        }) || [];

        await handleJobUpdate({ additionalTasks: updatedTasks });
        toast({ title: "Quote Submitted", description: "Job Giver notified." });
    };

    const handlePayForVariation = async (task: AdditionalTask) => {
        if (!task.quoteAmount) return;
        if (!confirm(`Confirm payment of ₹${task.quoteAmount} for "${task.description}"?`)) return;

        setIsLoading(true);
        try {
            // reuse Add Funds Action
            const res = await createAddFundsOrderAction(
                job.id,
                user!.id,
                task.quoteAmount,
                `Variation Order: ${task.description}`,
                task.id // Link payment to task
            );

            if (!res.success || !res.data) {
                toast({ title: "Payment Error", description: res.error, variant: "destructive" });
                return;
            }

            // If success (Sandbox mode mimic)
            // Ideally we redirect to gateway. For now, let's assume direct success hook or we simulate it?
            // The API returns payment_session_id.
            // If we are in E2E/Dev mode, we might want to auto-fund.
            // But 'add-funds' creates a Pending transaction.

            // Critical: Client-side optimistic update? 
            // Only if we trust the user paid. Real flow: Wait for webhook.
            // BUT for this feature demo:

            const paymentSessionId = res.data.orderToken;

            // @ts-ignore
            if (window.Cashfree) {
                const checkoutOptions = {
                    paymentSessionId: paymentSessionId,
                    redirectTarget: "_self",
                };
                // @ts-ignore
                const cashfree = new window.Cashfree({ mode: "sandbox" });
                cashfree.checkout(checkoutOptions).then((result: any) => {
                    if (result.error) {
                        toast({ title: "Payment Failed", description: result.error.message, variant: "destructive" });
                    }
                });
            }
        } catch (e) {
            console.error(e);
            toast({ title: "Error", description: "Failed to pay for variation.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeclineVariation = async (task: AdditionalTask) => {
        if (!confirm("Decline this variation order?")) return;
        const updatedTasks = job.additionalTasks?.map((t: AdditionalTask) => {
            if (t.id === task.id) {
                return { ...t, status: 'declined' };
            }
            return t;
        }) || [];
        await handleJobUpdate({ additionalTasks: updatedTasks });
        toast({ title: "Variation Declined" });
    };



    // Fetch Job Data
    // Fetch Job Data


    const { setHelp } = useHelp();

    React.useEffect(() => {
        if (!job) return;
        setHelp({
            title: `Guide: ${job.title}`,
            content: (
                <div className="space-y-4">
                    <div className="bg-muted/50 p-4 rounded-md border">
                        <h4 className="font-semibold text-sm flex items-center gap-2 mb-2">
                            <Zap className="h-4 w-4 text-amber-500" />
                            Current Status: <Badge variant="outline">{job.status}</Badge>
                        </h4>
                        <p className="text-xs text-muted-foreground">
                            {job.status === 'open' && "Installers are reviewing this job. Wait for bids to arrive."}
                            {job.status === 'bid_accepted' && "Installer accepted the offer. Payment is needed to start work."}
                            {job.status === 'in_progress' && "Work has started. Communicate via chat and wait for completion."}
                            {job.status === 'work_submitted' && "Work is done. Job Giver must review proof and release funds."}
                        </p>
                    </div>

                    <div className="space-y-2">
                        <h4 className="font-semibold text-sm border-b pb-1">How it Works (Execution Flow)</h4>
                        {isJobGiver ? (
                            <ul className="list-decimal pl-5 space-y-2 text-sm text-muted-foreground">
                                <li>
                                    <strong>Review & Award:</strong> Check incoming bids in the &apos;Bids&apos; section. Click &apos;Send Offer&apos; to hire the best installer.
                                </li>
                                <li>
                                    <strong>Secure Funding:</strong> Once they accept, click &apos;Pay & Start&apos;. Funds are held safely in Escrow.
                                </li>
                                <li>
                                    <strong>Approve Work:</strong> When the job is done, review the photos. Click &apos;Approve&apos; to release the payment.
                                </li>
                            </ul>
                        ) : (
                            <ul className="list-decimal pl-5 space-y-2 text-sm text-muted-foreground">
                                <li>
                                    <strong>Place Bid:</strong> Submit your best quote. It&apos;s hidden from other installers (Blind Bidding).
                                </li>
                                <li>
                                    <strong>Wait for Award:</strong> If selected, you&apos;ll receive an offer to Accept.
                                </li>
                                <li>
                                    <strong>Submit Work:</strong> After finishing the job, upload proof in the &apos;Files&apos; tab and click &apos;Submit for Review&apos;.
                                </li>
                            </ul>
                        )}
                    </div>
                </div>
            )
        });
        return () => setHelp({ title: null, content: null });
    }, [setHelp, job, isJobGiver]);

    // Fetch Job Data & Listen for Changes
    // React.useEffect for job subscription removed. Handled by useJobSubscription hook.


    // --- Subscriptions handled by Hooks ---
    // useJobSubscription handles job updates.
    // useBidsSubscription handles bids.
    // Contact Reveal handled via Safe API or Server Component (TODO).


    const handleJobUpdate = async (updatedFields: Partial<Job>) => {
        if (!job || !user) return;
        console.log('[handleJobUpdate] Updating with fields:', Object.keys(updatedFields), 'awardedInstallerId=', updatedFields.awardedInstallerId);
        try {
            const res = await updateJobAction(job.id, user.id, updatedFields as any);
            if (res.success) {
                toast({ title: "Updated", description: "Job details updated." });
            } else {
                throw new Error(res.error);
            }
        } catch (error: any) {
            console.error("[handleJobUpdate] Update failed:", error);
            toast({ title: "Error", description: "Update failed", variant: "destructive" });
        }
    };

    const handleStartCheckout = async () => {
        setIsPaymentDialogOpen(true);
    };

    const handleConfirmPayment = async () => {
        if (!job || !user) return;

        try {
            // Initiate Payment Order via Server Action
            const res = await createPaymentOrderAction(
                job.id,
                user.id,
                winningBidAmount,
                job.travelTip
            );

            if (!res.success || !res.data) {
                toast({ title: "Payment Initialization Failed", description: res.error, variant: "destructive" });
                return;
            }

            const { orderToken } = res.data;

            if (cashfree) {
                cashfree.initialiseDropin({
                    orderToken,
                    onSuccess: () => {
                        console.log("Payment Success");
                        // Ideally we wait for webhook, but we can optimistically reload or toast
                        toast({ title: "Payment Successful", description: "Verifying status..." });
                        window.location.reload();
                    },
                    onFailure: (data: any) => {
                        console.log("Payment Failure", data);
                        toast({ title: "Payment Failed", description: data.message || "Transaction failed", variant: "destructive" });
                    },
                    components: ["order-details", "card", "netbanking", "app", "upi"]
                });
            } else {
                toast({ title: "Error", description: "Payment Gateway SDK not loaded.", variant: "destructive" });
            }
        } catch (e: any) {
            console.error("Payment Error:", e);
            toast({ title: "Error", description: e.message || "Unknown error", variant: "destructive" });
        }
    };

    // E2E Test Logic
    const handleDirectConfirm = React.useCallback(async () => {
        const auth = getAuth();
        const token = await auth.currentUser?.getIdToken();
        const runId = id; // use params id
        console.log('[E2E Client] handleDirectConfirm calling with jobID:', runId, 'Token present:', !!token);

        if (!token) {
            console.log('[E2E Client] No token found!');
            return;
        }

        try {
            const res = await axios.post('/api/e2e/fund-job-v2', {
                jobId: runId,
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log('[E2E Client] Fund Success:', res.data);
            toast({ title: "Test Mode: Payment Initiated", description: "Waiting for external funding..." });
        } catch (e: any) {
            console.log('[E2E Client] Fund Failed:', e.response?.data || e.message);
            toast({ title: "Fund Failed", description: "Check logs", variant: "destructive" });
        }

        // Removed redundant post-try toast to avoid confusion.
    }, [id, toast]);

    // E2E Shim: Expose function globally
    React.useEffect(() => {
        if (typeof window !== 'undefined') {
            console.log("Mounting e2e_directFundJob shim");
            (window as any).e2e_directFundJob = handleDirectConfirm;
        }
        return () => {
            if (typeof window !== 'undefined') {
                delete (window as any).e2e_directFundJob;
            }
        };
    }, [id, handleDirectConfirm]); // Depend on ID to ensure closure is fresh-ish, though handleDirectConfirm uses ref logic usually.
    // handleDirectConfirm is stable? Not wrapped in callback.
    // It uses 'id' from closure. 'id' comes from params.


    // Fetch Platform Settings (Fees & Rules)
    // Fetch Platform Settings (Defaults for Client)
    React.useEffect(() => {
        // Fallback defaults without DB call
        setPlatformSettings({
            jobGiverFeeRate: 2.5,
            installerCommissionRate: 5,
            minJobBudgetForMilestones: 5000
        } as any);
    }, []);



    if (loading) {
        return <JobDetailSkeleton />;
    }

    if (!job) {
        return <div className="p-8 text-center">Job not found.</div>;
    }

    // Determine Role View
    // isJobGiver is already defined at the top needed for useHelp hook


    // Winning Bid Amount logic moved to top (lines ~720)

    // Reschedule Logic
    // Reschedule Dialog State


    const handleReschedule = async (action: 'propose' | 'accept' | 'reject' | 'dismiss') => {
        setIsLoading(true);
        try {
            const auth = getAuth();
            const token = await auth.currentUser?.getIdToken();
            if (!token) throw new Error("Not authenticated");

            await axios.post(`/api/jobs/${job!.id}/reschedule`, {
                action,
                proposedDate: rescheduleDate,
                userId: user!.id,
                userRole: isJobGiver ? 'Job Giver' : 'Installer'
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast({ title: "Success", description: "Reschedule request processed." });
            setIsRescheduleDialogOpen(false);
            window.location.reload(); // Refresh to show new state
        } catch (error: any) {
            toast({ title: "Error", description: error.response?.data?.error || "Failed to process reschedule." });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-full overflow-x-hidden">
            <div className="container py-4 sm:py-6 space-y-4 sm:space-y-6 px-4 sm:px-6">
                {/* Reschedule Banner */}
                {job.dateChangeProposal && (
                    <div className={`border p-4 rounded-md flex flex-col md:flex-row items-center justify-between gap-4 ${job.dateChangeProposal.status === 'rejected' ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'
                        }`}>
                        <div className={`flex items-center gap-2 ${job.dateChangeProposal.status === 'rejected' ? 'text-red-800' : 'text-blue-800'}`}>
                            {job.dateChangeProposal.status === 'rejected' ? <XCircle className="h-5 w-5" /> : <Calendar className="h-5 w-5" />}
                            <div>
                                <p className="font-semibold">
                                    {job.dateChangeProposal.status === 'rejected' ? "Reschedule Request Rejected" : "Reschedule Request"}
                                </p>
                                <p className="text-sm">
                                    {job.dateChangeProposal.status === 'rejected' ? (
                                        <span>
                                            The other party rejected the new date. The job proceeds on <span className="font-bold">{job.jobStartDate ? new Date((job.jobStartDate as any).toDate ? (job.jobStartDate as any).toDate() : job.jobStartDate).toLocaleDateString() : 'Original Date'}</span>.
                                        </span>
                                    ) : (
                                        <span>
                                            {job.dateChangeProposal.proposedBy} proposed to move job to <span className="font-bold">{new Date((job.dateChangeProposal.newDate as any).toDate ? (job.dateChangeProposal.newDate as any).toDate() : job.dateChangeProposal.newDate).toLocaleDateString()}</span>
                                        </span>
                                    )}
                                </p>
                            </div>
                        </div>

                        {/* Pending Actions */}
                        {job.dateChangeProposal.status === 'pending' && (
                            <>
                                {((job.dateChangeProposal.proposedBy === 'Job Giver' && !isJobGiver) ||
                                    (job.dateChangeProposal.proposedBy === 'Installer' && isJobGiver)) ? (
                                    <div className="flex gap-2">
                                        <Button size="sm" variant="outline" onClick={() => handleReschedule('reject')} disabled={isLoading}>Reject</Button>
                                        <Button size="sm" onClick={() => handleReschedule('accept')} disabled={isLoading}>Accept New Date</Button>
                                    </div>
                                ) : (
                                    <div className="text-xs text-blue-600 italic">Waiting for response...</div>
                                )}
                            </>
                        )}

                        {/* Rejected Actions (Dismiss) */}
                        {job.dateChangeProposal.status === 'rejected' && (
                            <div className="flex gap-2">
                                {/* If Job Giver was rejected, show Cancel Hint? */}
                                {isJobGiver && (
                                    <Button size="sm" variant="destructive" onClick={() => setIsCancelDialogOpen(true)}>
                                        Cancel Job
                                    </Button>
                                )}
                                <Button size="sm" variant="outline" onClick={() => handleReschedule('dismiss')} disabled={isLoading}>
                                    Dismiss
                                </Button>
                            </div>
                        )}
                    </div>
                )}

                {/* Debug Logs */}


                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold overflow-wrap-anywhere" data-testid="job-title">{job.title}</h1>
                <Badge variant="outline" className="w-fit" data-testid="job-status-badge" data-status={job.status}>{job.status}</Badge>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 items-start">
                    <div className="lg:col-span-2 space-y-4 sm:space-y-6 order-2 lg:order-1">
                        <Card>
                            <CardHeader><CardTitle>Description</CardTitle></CardHeader>
                            <CardContent>
                                <p className="whitespace-pre-line mb-4 overflow-wrap-anywhere">{job.description}</p>

                                {/* Attachments Grid */}
                                {job.attachments && job.attachments.length > 0 && (
                                    <div className="space-y-2">
                                        <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                            <Paperclip className="h-4 w-4" />
                                            Attachments ({job.attachments.length})
                                        </h4>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                            {job.attachments.map((file: any, idx: number) => (
                                                <div key={idx} className="relative group aspect-square rounded-md overflow-hidden border bg-muted">
                                                    {file.fileType.startsWith('image/') ? (
                                                        <div
                                                            className="relative w-full h-full cursor-pointer transition-transform hover:scale-105"
                                                            onClick={() => window.open(file.fileUrl, '_blank')}
                                                        >
                                                            <Image
                                                                src={file.fileUrl}
                                                                alt={file.fileName}
                                                                fill
                                                                className="object-cover"
                                                                sizes="(max-width: 768px) 50vw, 25vw"
                                                            />
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col items-center justify-center h-full p-2 text-center text-xs text-muted-foreground">
                                                            <FileIcon className="h-8 w-8 mb-1" />
                                                            <span className="truncate w-full">{file.fileName}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Bids Section */}
                        <Card id="bids-section">
                            <CardHeader><CardTitle>Bids ({bids.length})</CardTitle></CardHeader>
                            <CardContent>
                                {bids.length === 0 ? <p className="text-muted-foreground">No bids yet.</p> : (
                                    <div className="space-y-4">
                                        {bids.map(bid => (
                                            <Card key={bid.id} data-testid="bid-card-wrapper">
                                                <CardContent className="p-4 flex justify-between items-center">
                                                    <div>
                                                        <p className="font-semibold text-lg" data-testid="bid-amount">
                                                            {isJobGiver || user?.id === getRefId(bid.installer) ? `₹${bid.amount}` : "₹ ••••"}
                                                        </p>
                                                        <p className="text-sm text-muted-foreground">{formatDistanceToNow(toDate(bid.timestamp))} ago</p>
                                                        {(!isJobGiver && user?.id !== getRefId(bid.installer)) && (
                                                            <p className="text-[10px] text-muted-foreground italic">Bid amount hidden</p>
                                                        )}
                                                    </div>
                                                    {/* Award Action (Only for Job Giver) */}
                                                    {isJobGiver && job.status === 'open' && (
                                                        <Button data-testid="send-offer-button" onClick={async () => {
                                                            // Award Logic
                                                            // 1. Update Job Status to 'Pending Acceptance' (Phase 4 of checklist)
                                                            // Or directly Awarded?
                                                            // Actually, standard flow: Job Giver Selects -> Installer Accepts.
                                                            // The 'Send Offer' button does this.

                                                            // We can handle this logic inside a "BidCard" component or here.
                                                            // For simplicity, just logic here:
                                                            const acceptanceDeadline = new Date();
                                                            acceptanceDeadline.setHours(acceptanceDeadline.getHours() + 24);

                                                            const installerId = bid.installerId || getRefId(bid.installer);
                                                            if (!installerId) {
                                                                console.error("Bid missing installer ID:", bid);
                                                                toast({ title: "Error", description: "Cannot award: missing installer ID", variant: "destructive" });
                                                                return;
                                                            }

                                                            try {
                                                                const res = await awardJobAction(
                                                                    job.id,
                                                                    user.id,
                                                                    installerId,
                                                                    acceptanceDeadline.toISOString()
                                                                );

                                                                if (res.success) {
                                                                    toast({ title: "Offer Sent", description: "Waiting for installer acceptance." });
                                                                } else {
                                                                    throw new Error(res.error);
                                                                }
                                                            } catch (err: any) {
                                                                console.error("Failed to award job:", err);
                                                                toast({
                                                                    title: "Award Failed",
                                                                    description: err.message || "Could not award job",
                                                                    variant: "destructive"
                                                                });
                                                            }
                                                        }}>
                                                            Send Offer
                                                        </Button>
                                                    )}
                                                </CardContent>
                                                {/* Bid Chat (Silent Bid Fix) */}
                                                <CardFooter className="pt-0 pb-4 px-4 bg-muted/20">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="w-full text-xs text-muted-foreground hover:text-primary"
                                                        onClick={() => {
                                                            const contactUrl = `/dashboard/messages?recipientId=${getRefId(bid.installer)}`;
                                                            window.open(contactUrl, '_blank');
                                                        }}
                                                    >
                                                        <MessageSquare className="h-3 w-3 mr-1" />
                                                        Ask Question / Chat
                                                    </Button>
                                                </CardFooter>
                                            </Card>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    <div className="space-y-4 sm:space-y-6 order-1 lg:order-2 lg:sticky lg:top-24 h-fit">
                        {/* Actions Panel */}
                        <Card data-testid="actions-panel">
                            <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <div className={cn("space-y-4", userLoading && "opacity-50 pointer-events-none")}>
                                    {userLoading && (
                                        <div className="flex items-center justify-center py-2 text-xs text-muted-foreground animate-pulse">
                                            <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                                            Syncing permissions...
                                        </div>
                                    )}

                                    {/* Job Giver Actions */}
                                    {isJobGiver && job.status === 'open' && (
                                        <Button variant="destructive" className="w-full min-h-[44px]" onClick={() => handleJobUpdate({ status: 'unbid' })}>Close Bidding</Button>
                                    )}

                                    {/* Installer Actions: Place Bid */}
                                    {!isJobGiver && job.status === 'open' && (
                                        <Button className="w-full min-h-[48px]" onClick={() => setIsBidDialogOpen(true)} disabled={userLoading || bids.some(b => getRefId(b.installer) === user?.id)} data-testid="place-bid-button">
                                            {bids.some(b => getRefId(b.installer) === user?.id) ? "Bid Placed" : "Place Bid"}
                                        </Button>
                                    )}

                                    {/* ... other actions truncated in this view but I will preserve them in real write ... */}
                                    {/* Wait, I have to provide the FULL content of the block I am replacing. */}
                                    {/* Let me rewrite the whole thing carefully. */}

                                    {/* Reschedule Action */}
                                    {job.status === 'in_progress' && !job.workStartedAt && !job.dateChangeProposal?.status.includes('pending') && (
                                        <Button variant="outline" className="w-full" onClick={() => setIsRescheduleDialogOpen(true)}>
                                            <Calendar className="mr-2 h-4 w-4" />
                                            Request Reschedule
                                        </Button>
                                    )}

                                    {/* Retract Offer */}
                                    {isJobGiver && job.status === 'bid_accepted' && (
                                        <div className="space-y-4">
                                            <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-sm text-amber-800">
                                                You have sent an offer. Waiting for installer to accept.
                                            </div>
                                            <Button
                                                variant="outline"
                                                className="w-full text-amber-600 border-amber-200 hover:bg-amber-50"
                                                onClick={async () => {
                                                    if (!window.confirm("Retract offer? This will allow other installers to bid again.")) return;
                                                    await handleJobUpdate({
                                                        status: 'open',
                                                        awardedInstaller: null as any,
                                                        selectedInstallers: null as any
                                                    });
                                                    toast({ title: "Offer Retracted", description: "Job is open for bidding again." });
                                                }}
                                            >
                                                <UserX className="mr-2 h-4 w-4" />
                                                Retract Offer
                                            </Button>
                                        </div>
                                    )}

                                    {isJobGiver && (job.status === 'bid_accepted' || job.status === 'Pending Funding') && (
                                        <Button className="w-full min-h-[44px]" onClick={handleStartCheckout} data-testid="proceed-payment-button">Proceed to Payment</Button>
                                    )}

                                    {/* Release Payment */}
                                    {isJobGiver && job.status === 'work_submitted' && (
                                        <Button className="w-full bg-green-600 hover:bg-green-700 min-h-[44px]" onClick={() => setIsReleaseDialogOpen(true)} data-testid="approve-work-button">
                                            <CheckCircle className="mr-2 h-4 w-4" />
                                            Approve Work & Release Payment
                                        </Button>
                                    )}

                                    {/* Raise Dispute */}
                                    {(job.status === 'in_progress' || job.status === 'work_submitted') && (
                                        <Button variant="destructive" className="w-full border-red-200 text-red-600 hover:bg-red-50" onClick={() => setIsDisputeDialogOpen(true)}>
                                            <ShieldAlert className="mr-2 h-4 w-4" />
                                            Report Issue / Raise Dispute
                                        </Button>
                                    )}

                                    {/* Leave Review */}
                                    {job.status === 'Completed' && (
                                        <div className="space-y-2">
                                            <Button className="w-full" variant="outline" onClick={() => setIsReviewDialogOpen(true)} data-testid="leave-review-button">
                                                <Star className="mr-2 h-4 w-4" />
                                                Leave Review
                                            </Button>

                                            <Button
                                                className="w-full"
                                                variant="secondary"
                                                onClick={() => window.open(`/dashboard/jobs/${job.id}/invoice`, '_blank')}
                                                data-testid="download-invoice-button"
                                            >
                                                <FileText className="mr-2 h-4 w-4" />
                                                Download Service Invoice
                                            </Button>

                                            <Button
                                                className="w-full"
                                                variant="ghost"
                                                onClick={() => window.open(`/dashboard/jobs/${job.id}/invoice?type=platform`, '_blank')}
                                                data-testid="download-platform-invoice-button"
                                            >
                                                <FileText className="mr-2 h-4 w-4" />
                                                Download Platform Receipt
                                            </Button>
                                        </div>
                                    )}

                                    {/* Secure Contact Reveal */}
                                    {counterParty && (
                                        <div className="space-y-4">
                                            <div className="border rounded-lg overflow-hidden">
                                                <div className="bg-gradient-to-r from-blue-600 to-blue-400 p-3 text-white">
                                                    <h4 className="font-bold text-sm flex items-center">
                                                        <ShieldCheck className="h-4 w-4 mr-2" />
                                                        Verified Identity
                                                    </h4>
                                                </div>
                                                <div className="p-4 bg-background flex items-center gap-4">
                                                    <Avatar className="h-16 w-16 border-2 border-white shadow-sm">
                                                        <AvatarImage src={counterParty.realAvatarUrl || counterParty.avatarUrl} />
                                                        <AvatarFallback>{counterParty.name.substring(0, 2)}</AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <p className="font-bold text-lg leading-none">{counterParty.name}</p>
                                                        <p className="text-sm text-muted-foreground">{isJobGiver ? "Installer" : "Job Giver"}</p>
                                                        <div className="flex items-center gap-1 mt-1 text-xs text-green-600 font-medium">
                                                            <CheckCircle2 className="h-3 w-3" />
                                                            Background Checked
                                                        </div>
                                                    </div>
                                                </div>
                                                {counterParty.mobile && (
                                                    <div className="bg-blue-50 p-3 border-t border-blue-100 flex items-center justify-between">
                                                        <span className="text-xs text-blue-700 font-semibold">Mobile Contact</span>
                                                        <a href={`tel:${counterParty.mobile}`} className="text-sm font-bold text-blue-900 flex items-center hover:underline">
                                                            <Phone className="h-3 w-3 mr-1" />
                                                            {counterParty.mobile}
                                                        </a>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Acceptance Section */}
                                    {
                                        !isJobGiver && job.status === 'bid_accepted' && (
                                            <InstallerAcceptanceSection job={job} user={user!} onJobUpdate={handleJobUpdate} />
                                        )
                                    }

                                    {/* Completion Sections */}
                                    {
                                        !isJobGiver && (job.status === 'in_progress' || job.status === 'In Progress' || job.status === 'bid_accepted' || job.status === 'Pending Funding') && !job.workStartedAt && (
                                            <StartWorkInput job={job} user={user!} onJobUpdate={handleJobUpdate} />
                                        )
                                    }

                                    {
                                        !isJobGiver && (job.status === 'in_progress' || job.status === 'In Progress') && job.workStartedAt && (
                                            <InstallerCompletionSection job={job} user={user!} onJobUpdate={handleJobUpdate} />
                                        )
                                    }

                                    {
                                        isJobGiver && (job.status === 'in_progress' || job.status === 'In Progress' || job.status === 'work_submitted' || job.status === 'Work Submitted' || job.status === 'Pending Confirmation') && (
                                            <JobGiverConfirmationSection
                                                job={job}
                                                user={user!}
                                                onJobUpdate={handleJobUpdate}
                                                onCancel={() => setIsCancelDialogOpen(true)}
                                                onAddFunds={() => setIsAddFundsDialogOpen(true)}
                                            />
                                        )
                                    }

                                    {
                                        job.status === 'Completed' && (
                                            <RatingSection job={job} onJobUpdate={handleJobUpdate} />
                                        )
                                    }
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <FundingBreakdownDialog
                        open={isPaymentDialogOpen}
                        onOpenChange={setIsPaymentDialogOpen}
                        job={job}
                        onConfirm={handleConfirmPayment}
                        onDirectConfirm={handleDirectConfirm}
                        platformSettings={platformSettings}
                        bidAmount={bids.find((b: any) => getRefId(b.installer) === (typeof job.awardedInstaller === 'string' ? job.awardedInstaller : getRefId(job.awardedInstaller)))?.amount || (job as any).budget?.min || 0}
                    />

                    {/* Variation Orders Section */}
                    {/* Variation Orders Section */}
                    <div className="md:col-span-3 mt-8 order-3">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle>Variation Orders (Add Work)</CardTitle>
                                <Button onClick={() => setIsVariationDialogOpen(true)} variant="outline" size="sm" data-testid="propose-variation-button">
                                    <Plus className="h-4 w-4 mr-2" />
                                    {isJobGiver ? "Request Variation" : "Propose Variation"}
                                </Button>
                            </CardHeader>
                            <CardContent>
                                {user && (
                                    <VariationOrderList
                                        job={job}
                                        user={user}
                                        isJobGiver={isJobGiver}
                                        onJobUpdate={handleJobUpdate}
                                        onPayForTask={handlePayForVariation}
                                        onQuoteTask={handleQuoteVariation}
                                        onDeclineTask={handleDeclineVariation}
                                    />
                                )}
                            </CardContent>
                        </Card>
                    </div>
                    {/* End Variation Orders Section */}

                    {/* Milestones Section */}
                    <div className="md:col-span-3 mt-8 order-4">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold">Payment Milestones</h3>
                            {isJobGiver && job.status === 'in_progress' && (
                                // Configurable Threshold Check
                                ((bids.find(b => getRefId(b.installer) === (typeof job.awardedInstaller === 'string' ? job.awardedInstaller : getRefId(job.awardedInstaller)))?.amount || (job as any).priceEstimate?.min || 0) >= (platformSettings?.minJobBudgetForMilestones ?? 5000))
                                    ? (
                                        <Button onClick={() => setIsMilestoneDialogOpen(true)} variant="outline" size="sm" data-testid="add-milestone-button">
                                            <Plus className="h-4 w-4 mr-2" />
                                            Add Milestone
                                        </Button>
                                    ) : (
                                        <div className="text-xs text-muted-foreground italic" title={`Milestones are only available for jobs over ₹${platformSettings?.minJobBudgetForMilestones ?? 5000}`}>
                                            Milestones unavailable for small jobs
                                        </div>
                                    )
                            )}
                        </div>
                        <MilestoneList
                            job={job}
                            user={user || null}
                            isJobGiver={isJobGiver}
                            onRelease={handleReleaseMilestone}
                        />
                    </div>

                    <MilestoneDialog
                        open={isMilestoneDialogOpen}
                        onOpenChange={setIsMilestoneDialogOpen}
                        onSubmit={handleCreateMilestone}
                        maxAmount={(() => {
                            const awardedBid = bids.find(b => getRefId(b.installer) === (typeof job.awardedInstaller === 'string' ? job.awardedInstaller : getRefId(job.awardedInstaller)));
                            const totalBudget = awardedBid?.amount || (job as any).priceEstimate?.max || 0;
                            const usedBudget = (job.milestones || []).reduce((acc: number, m: any) => acc + (Number(m.amount) || 0), 0);
                            return Math.max(0, totalBudget - usedBudget);
                        })()}
                    />

                    {/* Dialogs */}
                    <VariationOrderDialog
                        open={isVariationDialogOpen}
                        onOpenChange={setIsVariationDialogOpen}
                        onSubmitProposal={handleProposeVariation}
                        onSubmitRequest={handleRequestVariation}
                        isInstaller={!isJobGiver}
                    />

                    {
                        user && (
                            <PlaceBidDialog
                                job={job}
                                user={user}
                                onBidSubmit={() => {
                                    // Bids will auto-update via listener
                                    setIsBidDialogOpen(false);
                                }}
                                open={isBidDialogOpen}
                                onOpenChange={setIsBidDialogOpen}
                                platformSettings={platformSettings}
                            />
                        )
                    }

                    {
                        isJobGiver && user && (
                            <CancelJobDialog
                                job={job}
                                user={user}
                                onJobUpdate={handleJobUpdate}
                                open={isCancelDialogOpen}
                                onOpenChange={setIsCancelDialogOpen}
                            />
                        )
                    }

                    {
                        isJobGiver && user && (
                            <AddFundsDialog
                                job={job}
                                user={user}
                                open={isAddFundsDialogOpen}
                                onOpenChange={setIsAddFundsDialogOpen}
                                platformSettings={platformSettings}
                            />
                        )
                    }

                    {/* Reschedule Dialog */}
                    <Dialog open={isRescheduleDialogOpen} onOpenChange={setIsRescheduleDialogOpen}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Propose New Date</DialogTitle>
                                <DialogDescription>
                                    Ask the other party to reschedule the job. They must accept for the date to change.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="py-4">
                                <Label>New Date</Label>
                                <Input
                                    type="date"
                                    onChange={(e) => setRescheduleDate(e.target.valueAsDate || undefined)}
                                    min={new Date().toISOString().split('T')[0]} // No past dates
                                />
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsRescheduleDialogOpen(false)}>Cancel</Button>
                                <Button onClick={() => handleReschedule('propose')} disabled={!rescheduleDate || isLoading}>Send Proposal</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>
        </div>
    );
}
