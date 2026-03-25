"use client";

import { useUser } from "@/hooks/use-user";
import { useFirebase } from "@/infrastructure/firebase/client-provider";
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

import { auth } from "@/infrastructure/firebase/client";
import { DocumentReference, doc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { useJobSubscription } from "@/hooks/use-job-subscription";
import { useBidsSubscription } from "@/hooks/use-bids-subscription";
import { useFeatureFlag } from "@/lib/feature-flags-client";
import axios from "axios";
import { updateJobAction, approveJobAction, revealContactAction, awardJobAction, completeJobWithOtpAction } from "@/app/actions/job.actions";
import { createPaymentOrderAction, createAddFundsOrderAction } from "@/app/actions/payment.actions";
import { suggestPriceBoostAction } from "@/app/actions/ai.actions";


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
import { ProfessionalAcceptanceSection, tierIcons } from "@/components/job/professional-acceptance-section";
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
import { ProfessionalCompletionSection } from "@/components/job/professional-completion-section";
import { ClientConfirmationSection } from "@/components/job/client-confirmation-section";
import { ReleasePaymentDialog } from "@/components/job/release-payment-dialog";
import { DisputeDialog } from "@/components/job/dispute-dialog";
import { JobTimeline } from "@/components/job/job-timeline";
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from "framer-motion";


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
    const t = useTranslations('jobDetail');
    const tCommon = useTranslations('common');

    // Calculate Fees
    const clientFeeRate = platformSettings?.clientFeeRate || 2.5; // Default 2.5%
    const fee = Math.ceil(amount * (clientFeeRate / 100));
    const total = amount + fee;

    const handleAddFunds = async () => {
        if (amount <= 0 || !description.trim()) {
            toast({ title: tCommon('invalidInput'), description: t('notifications.enterAmountAndDesc'), variant: "destructive" });
            return;
        }

        setIsLoading(true);
        try {
            const res = await createAddFundsOrderAction(job.id, user.id, amount, description);

            if (!res.success || !res.data) {
                toast({ title: t('notifications.paymentGenericError'), description: res.error, variant: "destructive" });
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
                        toast({ title: t('notifications.paymentFailed'), description: result.error.message, variant: "destructive" });
                    }
                    if (result.redirect) {

                    }
                });
            } else {
                toast({ title: tCommon('error'), description: t('notifications.gatewayNotLoaded'), variant: "destructive" });
            }

        } catch (error: any) {
            toast({ title: tCommon('error'), description: t('notifications.initFailed'), variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t('addExtraFunds')}</DialogTitle>
                    <DialogDescription>{t('addFundsDesc')}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>{t('amountRupee')}</Label>
                        <Input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} />
                    </div>
                    <div className="space-y-2">
                        <Label>{t('description')}</Label>
                        <Input placeholder={t('notifications.exampleDesc')} value={description} onChange={async (e) => {
                            const val = e.target.value;
                            setDescription(val);
                            // Real-time moderation (debounced ideal, but simple here)
                            // Ideally handled on submit or blur
                        }} />
                    </div>

                    {amount > 0 && (
                        <div className="bg-muted p-3 rounded-md text-sm space-y-1">
                            <div className="flex justify-between">
                                <span>{t('baseAmount')}:</span>
                                <span>₹{amount}</span>
                            </div>
                            <div className="flex justify-between text-muted-foreground">
                                <span>{t('processingFee')} ({clientFeeRate}%):</span>
                                <span>₹{fee}</span>
                            </div>
                            <Separator className="my-1" />
                            <div className="flex justify-between font-bold">
                                <span>{t('totalPayable')}:</span>
                                <span>₹{total}</span>
                            </div>
                        </div>
                    )}

                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>{tCommon('cancel')}</Button>
                    <Button onClick={handleAddFunds} disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {t('payAmount', { amount: total || 0 })}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// External components: ProfessionalCompletionSection, ClientConfirmationSection


/* --- MAIN CLIENT COMPONENT --- */

export default function JobDetailClient({ isMapLoaded, initialJob, initialBids }: { isMapLoaded: boolean; initialJob?: any, initialBids?: any[] }) {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const { user, role, loading: userLoading, isAdmin } = useUser();
    const isProfessional = role === 'Professional';
    const t = useTranslations('jobDetail');
    const tCommon = useTranslations('common');
    const tJob = useTranslations('job');



    // const db = useFirestore(); // Legacy DB access removed

    const { toast } = useToast();

    const { job: realtimeJob, loading: jobLoading, error: jobError } = useJobSubscription(id, initialJob);
    const { bids, loading: bidsLoading } = useBidsSubscription(id, initialBids);

    // Merge initial and realtime, prefer realtime
    const job = realtimeJob || initialJob;
    const loading = jobLoading && !job;

    // Determine Winning Bid Amount (Hoisted for Payment Action)
    const winningBidAmount = React.useMemo(() => {
        if (!job?.awardedProfessional || !bids) return 0;
        const awardedId = getRefId(job.awardedProfessional);
        const winningBid = bids.find(b => getRefId(b.professional) === awardedId);
        return winningBid ? winningBid.amount : 0;
    }, [job, bids]);

    // Legacy setJob/setBids not needed except for optimism?
    // We rely on subscription updates.

    const [platformSettings, setPlatformSettings] = React.useState<PlatformSettings | null>(null);
    const [counterParty, setCounterParty] = React.useState<User | null>(null);
    const isClient = !!(user && job && (user.id === getRefId(job.client) || user.id === job.clientId));
    const awardedProfessionalId = job?.awardedProfessionalId || getRefId(job?.awardedProfessional);
    const canClientFundJob = !!(
        isClient &&
        awardedProfessionalId &&
        ['bid_accepted', 'Pending Funding', 'Awarded'].includes(job?.status || '')
    );

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

    // Feature Flags
    const isPaymentsEnabled = useFeatureFlag('ENABLE_PAYMENTS');
    const isDisputesEnabled = useFeatureFlag('ENABLE_DISPUTES_V2');
    // DEEP DEBUG LOGGING FOR E2E

    const [isMilestoneDialogOpen, setIsMilestoneDialogOpen] = React.useState(false);
    const [revealLoading, setRevealLoading] = React.useState(false);

    // AI Market Insights State
    const [marketAnalysis, setMarketAnalysis] = React.useState<any>(null);
    const [isAnalyzingMarket, setIsAnalyzingMarket] = React.useState(false);

    // Auto-trigger Market Analysis for Clients
    React.useEffect(() => {
        const analyzeMarket = async () => {
            if (!isClient || job.status !== 'open' || bids.length > 0 || marketAnalysis || isAnalyzingMarket) return;

            // Check if job is at least 1 day old (simulated check)
            const postedDate = toDate(job.postedAt);
            const hoursSincePosted = (Date.now() - postedDate.getTime()) / (1000 * 60 * 60);

            if (hoursSincePosted > 24 || process.env.NODE_ENV === 'development') {
                setIsAnalyzingMarket(true);
                try {
                    const res = await suggestPriceBoostAction({
                        jobTitle: job.title,
                        jobCategory: job.jobCategory,
                        pincode: job.address?.cityPincode || job.location,
                        currentBudget: job.priceEstimate?.min || 0,
                        isUrgent: job.isUrgent,
                        bidCount: bids.length,
                        daysSincePosted: Math.max(1, Math.floor(hoursSincePosted / 24))
                    });
                    if (res.success) {
                        setMarketAnalysis(res.data);
                    }
                } finally {
                    setIsAnalyzingMarket(false);
                }
            }
        };

        analyzeMarket();
    }, [isClient, job, bids.length, marketAnalysis, isAnalyzingMarket]);

    // Secure Contact Reveal Flow
    React.useEffect(() => {
        const fetchContact = async () => {
            if (!job || !user || revealLoading || counterParty) return;

            const secureStatuses = ['funded', 'in_progress', 'work_submitted', 'completed', 'disputed', 'In Progress', 'Completed', 'Pending Confirmation'];
            if (secureStatuses.includes(job.status)) {
                setRevealLoading(true);
                try {
                    const res = await revealContactAction(job.id, user.id);
                    if (res.success && res.contact) {
                        setCounterParty(res.contact as User);
                    }
                } finally {
                    setRevealLoading(false);
                }
            }
        };

        fetchContact();
    }, [job?.status, user?.id, counterParty, revealLoading]); // eslint-disable-line react-hooks/exhaustive-deps




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

            await handleJobUpdate({
                milestones: [...(job.milestones || []), newMilestone]
            });

            toast({ title: t('notifications.milestoneCreated'), description: t('notifications.milestoneCreatedDesc') });
        } catch (error) {
            toast({ title: tCommon('error'), description: t('notifications.milestoneGenericError'), variant: "destructive" });
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

            toast({ title: t('paymentReleased'), description: t('notifications.paymentReleased') });
        } catch (error) {
            toast({ title: tCommon('error'), description: t('notifications.paymentGenericError'), variant: "destructive" });
        }
    };

    const handleProposeVariation = async (description: string, amount: number) => {
        if (!job || !user) return;
        const newTask: AdditionalTask = {
            id: `TASK-${Date.now()}`,
            description,
            quoteAmount: amount,
            status: 'quoted',
            createdBy: 'Professional',
            createdAt: new Date()
        };
        await handleJobUpdate({
            additionalTasks: [...(job.additionalTasks || []), newTask]
        });
        toast({ title: t('notifications.variationProposed'), description: t('notifications.variationProposedDesc') });
    };

    const handleRequestVariation = async (description: string) => {
        if (!job || !user) return;
        const newTask: AdditionalTask = {
            id: `TASK-${Date.now()}`,
            description,
            status: 'pending-quote',
            createdBy: 'Client',
            createdAt: new Date()
        };
        await handleJobUpdate({
            additionalTasks: [...(job.additionalTasks || []), newTask]
        });
        toast({ title: t('notifications.variationRequested'), description: t('notifications.variationRequestedDesc') });
    };

    const handleQuoteVariation = async (task: AdditionalTask) => {
        const quote = prompt(t('notifications.enterQuoteAmount'));
        if (!quote || isNaN(Number(quote))) return;

        const amount = Number(quote);
        const updatedTasks = job.additionalTasks?.map((t: AdditionalTask) => {
            if (t.id === task.id) {
                return { ...t, quoteAmount: amount, status: 'quoted' };
            }
            return t;
        }) || [];

        await handleJobUpdate({ additionalTasks: updatedTasks });
        toast({ title: t('notifications.quoteSubmitted'), description: t('notifications.quoteSubmittedDesc') });
    };

    const handlePayForVariation = async (task: AdditionalTask) => {
        if (!task.quoteAmount) {
            return;
        }

        const confirmed = confirm(t('notifications.confirmVariationPayment', { amount: task.quoteAmount, description: task.description }));
        if (!confirmed) return;

        setIsLoading(true);
        try {
            const res = await createAddFundsOrderAction(
                job.id,
                user!.id,
                task.quoteAmount,
                `Variation Order: ${task.description}`,
                task.id // Link payment to task
            );

            if (!res.success || !res.data) {
                toast({ title: t('notifications.paymentGenericError'), description: res.error, variant: "destructive" });
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

            // E2E Mock Checkout Bypass
            const isE2E = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
            if (isE2E) {
                toast({ title: "Test Mode: Variation Payment Initiated", description: "Bypassed Cashfree for E2E" });
                // Simulate webhook success: update task status
                const updatedTasks = job.additionalTasks?.map((t: AdditionalTask) => {
                    if (t.id === task.id) {
                        return { ...t, status: 'approved' }; // Or funded
                    }
                    return t;
                }) || [];
                await handleJobUpdate({ additionalTasks: updatedTasks });
                return;
            }

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
                        toast({ title: t('notifications.paymentFailed'), description: result.error.message, variant: "destructive" });
                    }
                });
            }
        } catch (e) {
            toast({ title: tCommon('error'), description: t('notifications.paymentGenericError'), variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeclineVariation = async (task: AdditionalTask) => {
        if (!confirm(t('notifications.variationDeclineConfirm'))) return;
        const updatedTasks = job.additionalTasks?.map((t: AdditionalTask) => {
            if (t.id === task.id) {
                return { ...t, status: 'declined' };
            }
            return t;
        }) || [];
        await handleJobUpdate({ additionalTasks: updatedTasks });
        toast({ title: t('notifications.variationDeclined') });
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
                            {t('currentStatus')}: <Badge variant="outline">{job.status}</Badge>
                        </h4>
                        <p className="text-xs text-muted-foreground">
                            {job.status === 'open' && tJob('guideOpen')}
                            {job.status === 'bid_accepted' && tJob('guideBidAccepted')}
                            {job.status === 'in_progress' && tJob('guideInProgress')}
                            {job.status === 'work_submitted' && tJob('guideWorkSubmitted')}
                        </p>
                    </div>

                    <div className="space-y-2">
                        <h4 className="font-semibold text-sm border-b pb-1">{tJob('howItWorks')}</h4>
                        {isClient ? (
                            <ul className="list-decimal pl-5 space-y-2 text-sm text-muted-foreground">
                                <li>
                                    <strong>{tJob('reviewAward')}:</strong> {tJob('reviewAwardDesc')}
                                </li>
                                <li>
                                    <strong>{tJob('secureFunding')}:</strong> {tJob('secureFundingDesc')}
                                </li>
                                <li>
                                    <strong>{tJob('approveWork')}:</strong> {tJob('approveWorkDesc')}
                                </li>
                            </ul>
                        ) : (
                            <ul className="list-decimal pl-5 space-y-2 text-sm text-muted-foreground">
                                <li>
                                    <strong>{tJob('placeBid')}:</strong> {tJob('placeBidDesc')}
                                </li>
                                <li>
                                    <strong>{tJob('waitAward')}:</strong> {tJob('waitAwardDesc')}
                                </li>
                                <li>
                                    <strong>{tJob('submitWork')}:</strong> {tJob('submitWorkDesc')}
                                </li>
                            </ul>
                        )}
                    </div>
                </div>
            )
        });
        return () => setHelp({ title: null, content: null });
    }, [setHelp, job, isClient, t, tJob]);

    // Fetch Job Data & Listen for Changes
    // React.useEffect for job subscription removed. Handled by useJobSubscription hook.


    // --- Subscriptions handled by Hooks ---
    // useJobSubscription handles job updates.
    // useBidsSubscription handles bids.
    // Contact Reveal handled via `revealContactAction` server action.


    const handleJobUpdate = async (updatedFields: Partial<Job>) => {
        if (!job || !user) return;
        try {
            const res = await updateJobAction(job.id, user.id, updatedFields as any);
            if (res.success) {
                toast({ title: tCommon('updated'), description: t('notifications.jobUpdated') });
            } else {
                throw new Error(res.error);
            }
        } catch (error: any) {
            toast({ title: tCommon('error'), description: t('notifications.updateFailed'), variant: "destructive" });
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
                toast({ title: t('notifications.paymentGenericError'), description: res.error, variant: "destructive" });
                return;
            }

            const { orderToken } = res.data;

            if (cashfree) {
                cashfree.initialiseDropin({
                    orderToken,
                    onSuccess: () => {
                        // Ideally we wait for webhook, but we can optimistically reload or toast
                        toast({ title: t('notifications.paymentSuccess'), description: t('notifications.paymentVerifying') });
                        window.location.reload();
                    },
                    onFailure: (data: any) => {
                        toast({ title: t('notifications.paymentFailed'), description: data.message || "Transaction failed", variant: "destructive" });
                    },
                    components: ["order-details", "card", "netbanking", "app", "upi"]
                });
            } else {
                toast({ title: tCommon('error'), description: t('notifications.gatewayNotLoaded'), variant: "destructive" });
            }
        } catch (e: any) {
            toast({ title: tCommon('error'), description: e.message || "Unknown error", variant: "destructive" });
        }
    };

    // E2E Test Logic
    const handleDirectConfirm = React.useCallback(async (options?: { simulateError?: boolean }) => {
        console.log('[E2E-FUND] handleDirectConfirm started');
        const token = await auth.currentUser?.getIdToken();
        const runId = id; // use params id

        if (!token) {
            console.error('[E2E-FUND] No user token found in handleDirectConfirm');
            toast({ title: "Fund Failed", description: "No session found. Please re-login.", variant: "destructive" });
            return;
        }

        if (options?.simulateError) {
            toast({ title: "Test Mode: Simulated Error", description: "Simulation triggered successfully", variant: "destructive" });
            throw new Error("Simulated Card Failure");
        }

        try {
            console.log(`[E2E-FUND] Sending request to v2 for Job: ${runId}`);
            const res = await axios.post('/api/e2e/fund-job-v2', {
                jobId: runId,
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log('[E2E-FUND] API Response:', res.status, res.data);
            toast({ title: "Test Mode: Payment Initiated", description: "Waiting for external funding..." });
        } catch (e: any) {
            console.error('[E2E-FUND] Direct fund failed:', e.response?.data || e.message);
            toast({ title: "Fund Failed", description: "Check logs", variant: "destructive" });
        }
    }, [id, toast]);

    // E2E Shim: Expose function globally
    React.useEffect(() => {
        if (typeof window !== 'undefined') {
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
            clientFeeRate: 2.5,
            professionalCommissionRate: 5,
            minJobBudgetForMilestones: 5000
        } as any);
    }, []);



    if (loading) {
        return <JobDetailSkeleton />;
    }

    if (!job) {
        return <div className="p-8 text-center">{t('jobNotFound')}</div>;
    }

    // Determine Role View
    // isClient is already defined at the top needed for useHelp hook


    // Winning Bid Amount logic moved to top (lines ~720)

    // Reschedule Logic
    // Reschedule Dialog State


    const handleReschedule = async (action: 'propose' | 'accept' | 'reject' | 'dismiss') => {
        setIsLoading(true);
        try {
            const token = await auth.currentUser?.getIdToken();
            if (!token) throw new Error("Not authenticated");

            await axios.post(`/api/jobs/${job!.id}/reschedule`, {
                action,
                proposedDate: rescheduleDate,
                userId: user!.id,
                userRole: isClient ? 'Client' : 'Professional'
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast({ title: tCommon('success'), description: t('notifications.rescheduleProcessed') });
            setIsRescheduleDialogOpen(false);
            window.location.reload(); // Refresh to show new state
        } catch (error: any) {
            toast({ title: tCommon('error'), description: error.response?.data?.error || t('notifications.rescheduleFailed') });
        } finally {
            setIsLoading(false);
        }
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
    };

    return (
        <motion.div 
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="max-w-full overflow-x-hidden pb-20"
        >
            <div className="container py-8 sm:py-12 space-y-8 sm:space-y-12 px-4 sm:px-8">
                {/* Reschedule Banner */}
                {job.dateChangeProposal && (
                    <motion.div variants={itemVariants} className={`border-none p-6 rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden backdrop-blur-xl ${job.dateChangeProposal.status === 'rejected' ? 'bg-destructive/10' : 'bg-primary/10'
                        }`}>
                        <div className={`flex items-center gap-4 ${job.dateChangeProposal.status === 'rejected' ? 'text-destructive' : 'text-primary'}`}>
                            <div className="bg-background/50 p-3 rounded-2xl">
                                {job.dateChangeProposal.status === 'rejected' ? <XCircle className="h-6 w-6" /> : <Calendar className="h-6 w-6" />}
                            </div>
                            <div>
                                <p className="font-black text-lg tracking-tight decoration-skip-ink">
                                    {job.dateChangeProposal.status === 'rejected' ? t('rescheduleRejected') : t('rescheduleRequest')}
                                </p>
                                <p className="text-sm font-medium opacity-70 italic tracking-tight">
                                    {job.dateChangeProposal.status === 'rejected' ? (
                                        <span>
                                            {t('otherPartyRejected', { date: job.jobStartDate ? new Date((job.jobStartDate as any).toDate ? (job.jobStartDate as any).toDate() : job.jobStartDate).toLocaleDateString() : 'Original Date' })}
                                        </span>
                                    ) : (
                                        <span>
                                            {t('proposedMoveJob', {
                                                user: job.dateChangeProposal.proposedBy,
                                                date: new Date((job.dateChangeProposal.newDate as any).toDate ? (job.dateChangeProposal.newDate as any).toDate() : job.dateChangeProposal.newDate).toLocaleDateString()
                                            })}
                                        </span>
                                    )}
                                </p>
                            </div>
                        </div>

                        {/* Pending Actions */}
                        {job.dateChangeProposal.status === 'pending' && (
                            <>
                                {((job.dateChangeProposal.proposedBy === 'Client' && !isClient) ||
                                    (job.dateChangeProposal.proposedBy === 'Professional' && isClient)) ? (
                                    <div className="flex gap-3">
                                        <Button variant="outline" className="h-11 px-6 rounded-2xl font-black text-xs uppercase tracking-widest" onClick={() => handleReschedule('reject')} disabled={isLoading}>{tCommon('decline')}</Button>
                                        <Button className="h-11 px-6 rounded-2xl font-black text-xs uppercase tracking-widest" onClick={() => handleReschedule('accept')} disabled={isLoading}>{t('acceptNewDate')}</Button>
                                    </div>
                                ) : (
                                    <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 italic">{t('waitingResponse')}</div>
                                )}
                            </>
                        )}

                        {/* Rejected Actions (Dismiss) */}
                        {job.dateChangeProposal.status === 'rejected' && (
                            <div className="flex gap-3">
                                {isClient && (
                                    <Button variant="destructive" className="h-11 px-6 rounded-2xl font-black text-xs uppercase tracking-widest" onClick={() => setIsCancelDialogOpen(true)}>
                                        {tCommon('cancel')}
                                    </Button>
                                )}
                                <Button variant="outline" className="h-11 px-6 rounded-2xl font-black text-xs uppercase tracking-widest" onClick={() => handleReschedule('dismiss')} disabled={isLoading}>
                                    {t('dismiss')}
                                </Button>
                            </div>
                        )}
                    </motion.div>
                )}

                <div className="space-y-6">
                    <motion.h1 
                        variants={itemVariants}
                        className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tighter overflow-wrap-anywhere bg-gradient-to-br from-foreground to-foreground/50 bg-clip-text text-transparent italic" 
                        data-testid="job-title"
                    >
                        {job.title}
                    </motion.h1>
                    
                    <motion.div variants={itemVariants} className="flex flex-col gap-6">
                        <div className="flex flex-wrap items-center gap-3">
                            <Badge variant={getStatusVariant(job.status)} className="px-5 py-2 rounded-full font-black text-[10px] uppercase tracking-widest shadow-xl border-none" data-testid="job-status-badge" data-status={job.status}>
                                {job.status.replace(/_/g, ' ').toUpperCase()}
                            </Badge>
                            {job.status === 'funded' && (
                                <Badge className="bg-success text-white flex items-center gap-2 px-5 py-2 rounded-full font-black text-[10px] uppercase tracking-widest shadow-xl animate-in fade-in zoom-in duration-500">
                                    <ShieldCheck className="h-4 w-4" />
                                    PLATFORM GUARANTEED
                                </Badge>
                            )}
                        </div>
                        <Card className="border-none bg-card/40 backdrop-blur-xl shadow-2xl rounded-[2.5rem] overflow-hidden">
                            <div className="h-1 w-full bg-gradient-to-r from-primary/30 to-accent/30" />
                            <CardContent className="p-8">
                                <JobTimeline status={job.status} userRole={isClient ? 'Client' : 'Professional'} />
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 sm:gap-12 items-start">
                    <div className="lg:col-span-2 space-y-8 sm:space-y-12 order-2 lg:order-1">
                        <motion.div variants={itemVariants}>
                            <Card className="border-none bg-card/40 backdrop-blur-xl shadow-2xl rounded-[2.5rem] overflow-hidden">
                                <CardHeader className="p-8 pb-4">
                                    <CardTitle className="text-2xl font-black tracking-tighter italic uppercase opacity-80">{t('description')}</CardTitle>
                                </CardHeader>
                                <CardContent className="p-8 pt-0">
                                    <p className="whitespace-pre-line mb-8 text-lg leading-relaxed opacity-90 font-medium">{job.description}</p>

                                    {/* Attachments Grid */}
                                    {job.attachments && job.attachments.length > 0 && (
                                        <div className="space-y-4">
                                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                                                <Paperclip className="h-4 w-4" />
                                                {t('attachments')} ({job.attachments.length})
                                            </h4>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                                {job.attachments.map((file: any, idx: number) => (
                                                    <motion.div 
                                                        whileHover={{ scale: 1.05 }}
                                                        key={idx} 
                                                        className="relative group aspect-square rounded-3xl overflow-hidden border-none bg-background/50 cursor-pointer shadow-lg"
                                                        onClick={() => window.open(file.fileUrl, '_blank')}
                                                    >
                                                        {file.fileType.startsWith('image/') ? (
                                                            <Image
                                                                src={file.fileUrl}
                                                                alt={file.fileName}
                                                                fill
                                                                className="object-cover transition-transform group-hover:scale-110"
                                                                sizes="(max-width: 768px) 50vw, 25vw"
                                                            />
                                                        ) : (
                                                            <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                                                                <FileIcon className="h-10 w-10 mb-2 opacity-20" />
                                                                <span className="truncate w-full text-[10px] font-black uppercase tracking-widest opacity-40">{file.fileName}</span>
                                                            </div>
                                                        )}
                                                        <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                                                            <Plus className="h-8 w-8 text-white" />
                                                        </div>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </motion.div>

                        {/* Bids Section */}
                        <motion.div variants={itemVariants} id="bids-section">
                            <Card className="border-none bg-card/40 backdrop-blur-xl shadow-2xl rounded-[2.5rem] overflow-hidden">
                                <CardHeader className="p-8 pb-4">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-2xl font-black tracking-tighter italic uppercase opacity-80">{tJob('bidsTab')} ({bids.length})</CardTitle>
                                        <div className="bg-primary/10 px-4 py-2 rounded-2xl">
                                            <Users className="h-5 w-5 text-primary" />
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-8 pt-0">
                                    {isClient && marketAnalysis && bids.length === 0 && (
                                        <div className="mb-8 p-8 bg-gradient-to-br from-indigo-500/10 via-blue-500/10 to-accent/10 border-none rounded-[2rem] relative overflow-hidden group">
                                            <div className="absolute -top-10 -right-10 p-4 opacity-5 group-hover:scale-110 transition-transform rotate-12">
                                                <TrendingUp className="h-40 w-40 text-indigo-500" />
                                            </div>
                                            <div className="relative z-10 space-y-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="bg-indigo-500 p-2 rounded-xl shadow-lg shadow-indigo-500/20">
                                                        <Sparkles className="h-5 w-5 text-white animate-pulse" />
                                                    </div>
                                                    <h4 className="font-black text-xs uppercase tracking-widest text-indigo-500">AI Market Insight</h4>
                                                </div>
                                                <p className="text-lg font-medium leading-relaxed opacity-80">
                                                    {marketAnalysis.reasoning}
                                                </p>
                                                <div className="bg-background/40 backdrop-blur-md p-6 rounded-[1.5rem] flex flex-col sm:flex-row items-center justify-between gap-6">
                                                    <div className="flex items-center gap-4">
                                                        <div className="bg-indigo-500/20 p-3 rounded-2xl">
                                                            <Zap className="h-6 w-6 text-indigo-500" />
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest opacity-60">Recommendation</p>
                                                            <p className="font-black text-lg italic tracking-tight">{marketAnalysis.recommendedAction}</p>
                                                        </div>
                                                    </div>
                                                    <Button className="h-12 px-8 rounded-2xl bg-indigo-500 hover:bg-indigo-600 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-500/20">
                                                        Apply Boost
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {bids.length === 0 ? (
                                        <div className="py-20 text-center flex flex-col items-center justify-center gap-4">
                                            <div className="p-6 bg-muted rounded-full">
                                                <Hourglass className="h-12 w-12 opacity-20" />
                                            </div>
                                            <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">{t('noBidsYet')}</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            <AnimatePresence>
                                                {bids.map((bid, index) => (
                                                    <motion.div 
                                                        key={bid.id}
                                                        initial={{ opacity: 0, x: -20 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: index * 0.1 }}
                                                        data-testid="bid-card-wrapper"
                                                        className="group bg-background/30 hover:bg-background/50 transition-colors p-6 rounded-[2rem] flex flex-col sm:flex-row justify-between items-center gap-6 border-none shadow-sm"
                                                    >
                                                        <div className="flex items-center gap-6">
                                                            <div className="relative">
                                                                <Avatar className="h-16 w-16 border-4 border-background/50 shadow-xl group-hover:scale-110 transition-transform font-black">
                                                                    <AvatarFallback className="bg-primary/10 text-primary uppercase">PR</AvatarFallback>
                                                                </Avatar>
                                                                <div className="absolute -bottom-1 -right-1 bg-success p-1.5 rounded-full border-2 border-background">
                                                                    <ShieldCheck className="h-3 w-3 text-white" />
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <div className="flex flex-col">
                                                                    <span className="text-2xl font-black tracking-tighter italic" data-testid="bid-amount">
                                                                        {isClient || user?.id === getRefId(bid.professional) ? `₹${bid.amount}` : "₹ ••••"}
                                                                    </span>
                                                                    <span className="text-[10px] font-black uppercase tracking-widest opacity-40">
                                                                        {formatDistanceToNow(toDate(bid.timestamp))} ago
                                                                    </span>
                                                                </div>
                                                                {(!isClient && user?.id !== getRefId(bid.professional)) && (
                                                                    <p className="text-[9px] font-black uppercase tracking-widest text-destructive mt-1 italic">{t('bidAmountHidden')}</p>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-3 w-full sm:w-auto">
                                                            <Button
                                                                variant="outline"
                                                                className="flex-1 sm:flex-none h-12 px-6 rounded-2xl hover:bg-background/50 border-none bg-background/30 font-black text-[10px] uppercase tracking-widest"
                                                                onClick={() => {
                                                                    const contactUrl = `/dashboard/messages?recipientId=${getRefId(bid.professional)}`;
                                                                    window.open(contactUrl, '_blank');
                                                                }}
                                                            >
                                                                <MessageSquare className="h-4 w-4 mr-2" />
                                                                {t('askQuestionChat')}
                                                            </Button>

                                                            {isClient && job.status === 'open' && (
                                                                <Button 
                                                                    data-testid="send-offer-button" 
                                                                    className="flex-1 sm:flex-none h-12 px-8 rounded-2xl bg-primary text-primary-foreground font-black text-[10px] uppercase tracking-widest shadow-xl shadow-primary/20"
                                                                    onClick={async () => {
                                                                        const acceptanceDeadline = new Date();
                                                                        acceptanceDeadline.setHours(acceptanceDeadline.getHours() + 24);
                                                                        const professionalId = bid.professionalId || getRefId(bid.professional);
                                                                        if (!professionalId) {
                                                                            toast({ title: tCommon('error'), description: "Cannot award: missing professional ID", variant: "destructive" });
                                                                            return;
                                                                        }
                                                                        try {
                                                                            const res = await awardJobAction(job.id, user.id, professionalId, acceptanceDeadline.toISOString());
                                                                            if (res.success) {
                                                                                toast({ title: t('offerSent'), description: t('waitingAcceptance') });
                                                                            } else {
                                                                                throw new Error(res.error);
                                                                            }
                                                                        } catch (err: any) {
                                                                            toast({ title: t('awardFailed'), description: err.message || "Could not award job", variant: "destructive" });
                                                                        }
                                                                    }}
                                                                >
                                                                    {t('sendOffer')}
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </motion.div>
                                                ))}
                                            </AnimatePresence>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </motion.div>
                    </div>

                    <div className="space-y-8 sm:space-y-12 order-1 lg:order-2 lg:sticky lg:top-24 h-fit">
                        {/* Actions Panel */}
                        <motion.div variants={itemVariants} className="sticky top-24">
                            <Card data-testid="actions-panel" className="border-none bg-primary/5 backdrop-blur-2xl shadow-2xl rounded-[2.5rem] overflow-hidden">
                                <div className="h-2 w-full bg-gradient-to-r from-primary to-accent" />
                                <CardHeader className="p-8 pb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-primary/20 p-2 rounded-xl">
                                            <Zap className="h-5 w-5 text-primary" />
                                        </div>
                                        <CardTitle className="text-xl font-black tracking-tighter italic uppercase">{t('actions')}</CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-8 space-y-4">
                                    <div className={cn("space-y-4", userLoading && "opacity-50 pointer-events-none")}>
                                        {userLoading && (
                                            <div className="flex items-center justify-center py-4 bg-background/20 rounded-2xl text-[10px] font-black uppercase tracking-widest opacity-60">
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                {t('syncingPermissions')}
                                            </div>
                                        )}

                                        {/* Client Actions */}
                                        {isClient && job.status === 'open' && (
                                            <Button variant="destructive" className="w-full h-14 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-destructive/10" onClick={() => handleJobUpdate({ status: 'unbid' })}>{t('closeBidding')}</Button>
                                        )}

                                        {/* Professional Actions: Place Bid */}
                                        {!isClient && job.status === 'open' && (
                                            <Button 
                                                className="w-full h-16 rounded-2xl bg-primary text-primary-foreground font-black text-sm uppercase tracking-[0.1em] shadow-2xl shadow-primary/20 group overflow-hidden relative" 
                                                onClick={() => setIsBidDialogOpen(true)} 
                                                disabled={userLoading || bids.some(b => getRefId(b.professional) === user?.id)} 
                                                data-testid="place-bid-button"
                                            >
                                                <span className="relative z-10">{bids.some(b => getRefId(b.professional) === user?.id) ? t('bidPlaced') : t('placeBid')}</span>
                                                <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform" />
                                            </Button>
                                        )}

                                        {/* Reschedule Action */}
                                        {job.status === 'in_progress' && !job.workStartedAt && !job.dateChangeProposal?.status.includes('pending') && (
                                            <Button variant="outline" className="w-full h-14 rounded-2xl border-none bg-background/50 font-black text-xs uppercase tracking-widest" onClick={() => setIsRescheduleDialogOpen(true)}>
                                                <Calendar className="mr-2 h-4 w-4" />
                                                {t('requestReschedule')}
                                            </Button>
                                        )}

                                        {/* Retract Offer */}
                                        {isClient && job.status === 'bid_accepted' && (
                                            <div className="space-y-4">
                                                <div className="p-6 bg-warning/10 border-none rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest text-warning italic leading-relaxed">
                                                    {t('offerSentMsg')}
                                                </div>
                                                <Button
                                                    variant="outline"
                                                    className="w-full h-14 rounded-2xl border-2 border-warning/20 bg-background/50 text-warning hover:bg-warning/10 font-black text-xs uppercase tracking-widest"
                                                    onClick={async () => {
                                                        if (!window.confirm("Retract offer? This will allow other professionals to bid again.")) return;
                                                        await handleJobUpdate({
                                                            status: 'open',
                                                            awardedProfessional: null as any,
                                                            selectedProfessionals: null as any
                                                        });
                                                        toast({ title: t('offerRetracted'), description: t('offerRetractedDesc') });
                                                    }}
                                                >
                                                    <UserX className="mr-2 h-4 w-4" />
                                                    {t('retractOffer')}
                                                </Button>
                                            </div>
                                        )}

                                        {canClientFundJob && (
                                            isPaymentsEnabled ? (
                                                <Button className="w-full h-16 rounded-2xl bg-success text-white font-black text-sm uppercase tracking-widest shadow-2xl shadow-success/20" onClick={handleStartCheckout} data-testid="proceed-payment-button">{t('proceedToPayment')}</Button>
                                            ) : (
                                                <div className="p-6 bg-muted rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest opacity-40 text-center">
                                                    {t('paymentsDisabled')}
                                                </div>
                                            )
                                        )}

                                        {/* Release Payment */}
                                        {isClient && job.status === 'work_submitted' && (
                                            isPaymentsEnabled ? (
                                                <Button className="w-full h-16 rounded-2xl bg-success text-white font-black text-sm uppercase tracking-widest shadow-2xl shadow-success/20" onClick={() => setIsReleaseDialogOpen(true)} data-testid="approve-work-button">
                                                    <CheckCircle className="mr-2 h-5 w-5" />
                                                    {t('approveWorkRelease')}
                                                </Button>
                                            ) : (
                                                <Button className="w-full h-14 rounded-2xl bg-muted text-muted-foreground font-black text-xs uppercase tracking-widest" disabled>
                                                    {t('paymentSystemOffline')}
                                                </Button>
                                            )
                                        )}

                                        {/* Raise Dispute */}
                                        {(job.status === 'in_progress' || job.status === 'work_submitted') && (
                                            isDisputesEnabled ? (
                                                <Button variant="destructive" className="w-full h-14 rounded-2xl bg-destructive/10 text-destructive hover:bg-destructive/20 font-black text-xs uppercase tracking-widest border-none" onClick={() => setIsDisputeDialogOpen(true)}>
                                                    <ShieldAlert className="mr-2 h-4 w-4" />
                                                    {t('reportIssueDispute')}
                                                </Button>
                                            ) : null
                                        )}

                                        {/* Leave Review */}
                                        {job.status === 'Completed' && (
                                            <div className="space-y-3">
                                                <Button className="w-full h-14 rounded-2xl border-none bg-background font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/5" variant="outline" onClick={() => setIsReviewDialogOpen(true)} data-testid="leave-review-button">
                                                    <Star className="mr-2 h-4 w-4 text-warning" />
                                                    {t('leaveReview')}
                                                </Button>

                                                <Button
                                                    className="w-full h-14 rounded-2xl border-none bg-background font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/5"
                                                    variant="secondary"
                                                    onClick={() => window.open(`/dashboard/jobs/${job.id}/invoice`, '_blank')}
                                                    data-testid="download-invoice-button"
                                                >
                                                    <FileText className="mr-2 h-4 w-4" />
                                                    {t('downloadServiceInvoice')}
                                                </Button>

                                                <Button
                                                    className="w-full h-10 rounded-2xl border-none bg-transparent hover:bg-background/50 font-black text-[9px] uppercase tracking-widest opacity-60"
                                                    variant="ghost"
                                                    onClick={() => window.open(`/dashboard/jobs/${job.id}/invoice?type=platform`, '_blank')}
                                                    data-testid="download-platform-invoice-button"
                                                >
                                                    {t('downloadPlatformReceipt')}
                                                </Button>
                                            </div>
                                        )}

                                        {/* Secure Contact Reveal */}
                                        {revealLoading && <div className="py-4 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}
                                        {counterParty && (
                                            <div className="space-y-4">
                                                <div className="bg-background/50 rounded-[2rem] overflow-hidden shadow-xl border-none">
                                                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-white">
                                                        <h4 className="font-black text-[10px] uppercase tracking-widest flex items-center">
                                                            <ShieldCheck className="h-4 w-4 mr-2" />
                                                            {t('verifiedIdentity')}
                                                        </h4>
                                                    </div>
                                                    <div className="p-6 flex items-center gap-6">
                                                        <Avatar className="h-20 w-20 border-4 border-background shadow-2xl">
                                                            <AvatarImage src={counterParty.realAvatarUrl || counterParty.avatarUrl} />
                                                            <AvatarFallback className="font-black text-xl">{counterParty.name.substring(0, 2)}</AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <p className="font-black text-2xl tracking-tighter italic leading-none mb-1">{counterParty.name}</p>
                                                            <p className="text-[10px] font-black uppercase tracking-widest opacity-40">{isClient ? t('professional') : t('client')}</p>
                                                            <div className="flex items-center gap-1.5 mt-3 text-[10px] text-success font-black uppercase tracking-widest">
                                                                <CheckCircle2 className="h-3.5 w-3.5" />
                                                                {t('backgroundChecked')}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {counterParty.mobile && (
                                                        <div className="bg-background/80 p-6 border-t border-muted/20">
                                                            <a href={`tel:${counterParty.mobile}`} className="flex items-center justify-between group">
                                                                <span className="text-[10px] font-black uppercase tracking-widest opacity-40">{t('mobileContact')}</span>
                                                                <span className="text-xl font-black tracking-tighter italic text-primary group-hover:underline underline-offset-4">
                                                                    {counterParty.mobile}
                                                                </span>
                                                            </a>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Acceptance Section */}
                                        {
                                            !isClient && job.status === 'bid_accepted' && (
                                                <ProfessionalAcceptanceSection job={job} user={user!} onJobUpdate={handleJobUpdate} />
                                            )
                                        }

                                        {/* Completion Sections */}
                                        {
                                            !isClient && (job.status === 'in_progress' || job.status === 'In Progress' || job.status === 'bid_accepted' || job.status === 'Pending Funding') && !job.workStartedAt && (
                                                <StartWorkInput job={job} user={user!} onJobUpdate={handleJobUpdate} />
                                            )
                                        }

                                        {
                                            !isClient && (job.status === 'in_progress' || job.status === 'In Progress') && job.workStartedAt && (
                                                <ProfessionalCompletionSection job={job} user={user!} onJobUpdate={handleJobUpdate} />
                                            )
                                        }

                                        {
                                            isClient && (job.status === 'in_progress' || job.status === 'In Progress' || job.status === 'work_submitted' || job.status === 'Work Submitted' || job.status === 'Pending Confirmation') && (
                                                <ClientConfirmationSection
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
                        </motion.div>
                    </div>

                    <FundingBreakdownDialog
                        open={isPaymentDialogOpen}
                        onOpenChange={setIsPaymentDialogOpen}
                        job={job}
                        onConfirm={handleConfirmPayment}
                        onDirectConfirm={handleDirectConfirm}
                        platformSettings={platformSettings}
                        bidAmount={bids.find((b: any) => getRefId(b.professional) === (typeof job.awardedProfessional === 'string' ? job.awardedProfessional : getRefId(job.awardedProfessional)))?.amount || (job as any).budget?.min || 0}
                    />

                    {/* Variation Orders Section */}
                    {/* Variation Orders Section */}
                    <div className="md:col-span-3 mt-8 order-3">
                        <Card className="border-0 shadow-md shadow-primary/5">
                            <CardHeader className="flex flex-row items-center justify-between pb-4">
                                <CardTitle className="text-xl font-bold tracking-tight">{t('variationOrders')}</CardTitle>
                                <Button onClick={() => setIsVariationDialogOpen(true)} variant="outline" size="sm" data-testid="propose-variation-button">
                                    <Plus className="h-4 w-4 mr-2" />
                                    {isClient ? t('requestVariation') : t('proposeVariation')}
                                </Button>
                            </CardHeader>
                            <CardContent>
                                {user && (
                                    <VariationOrderList
                                        job={job}
                                        user={user}
                                        isClient={isClient}
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
                            <h3 className="text-lg font-semibold">{t('paymentMilestones')}</h3>
                            {isClient && job.status === 'in_progress' && (
                                // Configurable Threshold Check
                                ((bids.find(b => getRefId(b.professional) === (typeof job.awardedProfessional === 'string' ? job.awardedProfessional : getRefId(job.awardedProfessional)))?.amount || (job as any).priceEstimate?.min || 0) >= (platformSettings?.minJobBudgetForMilestones ?? 5000))
                                    ? (
                                        <Button onClick={() => setIsMilestoneDialogOpen(true)} variant="outline" size="sm" data-testid="add-milestone-button">
                                            <Plus className="h-4 w-4 mr-2" />
                                            {t('addMilestone')}
                                        </Button>
                                    ) : (
                                        <div className="text-xs text-muted-foreground italic" title={t('milestonesSmallJobTooltip', { amount: platformSettings?.minJobBudgetForMilestones ?? 5000 })}>
                                            {t('milestonesSmallJob')}
                                        </div>
                                    )
                            )}
                        </div>
                        <MilestoneList
                            job={job}
                            user={user || null}
                            isClient={isClient}
                            onRelease={handleReleaseMilestone}
                        />
                    </div>

                    <MilestoneDialog
                        open={isMilestoneDialogOpen}
                        onOpenChange={setIsMilestoneDialogOpen}
                        onSubmit={handleCreateMilestone}
                        maxAmount={(() => {
                            const awardedBid = bids.find(b => getRefId(b.professional) === (typeof job.awardedProfessional === 'string' ? job.awardedProfessional : getRefId(job.awardedProfessional)));
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
                        isProfessional={!isClient}
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
                        isClient && user && (
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
                        isClient && user && (
                            <AddFundsDialog
                                job={job}
                                user={user}
                                open={isAddFundsDialogOpen}
                                onOpenChange={setIsAddFundsDialogOpen}
                                platformSettings={platformSettings}
                            />
                        )
                    }

                    {
                        isClient && user && isPaymentsEnabled && (
                            <ReleasePaymentDialog
                                job={job}
                                user={user}
                                open={isReleaseDialogOpen}
                                onOpenChange={setIsReleaseDialogOpen}
                                onSuccess={() => window.location.reload()}
                            />
                        )
                    }

                    {
                        (job.status === 'in_progress' || job.status === 'work_submitted' || job.status === 'completed') && user && isDisputesEnabled && (
                            <DisputeDialog
                                job={job}
                                user={user}
                                open={isDisputeDialogOpen}
                                onOpenChange={setIsDisputeDialogOpen}
                                onSuccess={() => window.location.reload()}
                            />
                        )
                    }

                    {/* Reschedule Dialog */}
                    <Dialog open={isRescheduleDialogOpen} onOpenChange={setIsRescheduleDialogOpen}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{t('proposeNewDate')}</DialogTitle>
                                <DialogDescription>
                                    {t('proposeNewDateDesc')}
                                </DialogDescription>
                            </DialogHeader>
                            <div className="py-4">
                                <Label>{t('newDate')}</Label>
                                <Input
                                    type="date"
                                    onChange={(e) => setRescheduleDate(e.target.valueAsDate || undefined)}
                                    min={new Date().toISOString().split('T')[0]} // No past dates
                                />
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsRescheduleDialogOpen(false)}>{tCommon('cancel')}</Button>
                                <Button onClick={() => handleReschedule('propose')} disabled={!rescheduleDate || isLoading}>{t('sendProposal')}</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>
        </motion.div>
    );
}
