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
import { updateJobAction, approveJobAction, revealContactAction, awardJobAction, completeJobWithOtpAction, submitWorkAction } from "@/app/actions/job.actions";
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
            <DialogContent className="max-w-xl p-0 overflow-hidden border-none rounded-[3rem] bg-background font-sans shadow-2xl">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 pointer-events-none" />
                <div className="relative p-10 space-y-8">
                    <header className="text-center space-y-4">
                        <div className="inline-flex items-center justify-center h-20 w-20 rounded-[2rem] bg-primary/10 text-primary shadow-inner mb-2 animate-bounce-subtle">
                            <Wallet className="h-10 w-10" />
                        </div>
                        <DialogTitle className="text-4xl font-black tracking-tighter italic uppercase bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent">
                            {t('addFunds')}
                        </DialogTitle>
                        <p className="text-muted-foreground font-medium text-lg leading-relaxed max-w-sm mx-auto">
                            Fund your project escrow to officially start the production cycle.
                        </p>
                    </header>

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Project Installment (₹)</Label>
                            <Input
                                type="number"
                                placeholder="0.00"
                                value={amount || ""}
                                onChange={(e) => setAmount(Number(e.target.value))}
                                className="h-16 rounded-2xl border-none bg-muted/40 text-2xl font-black italic px-6 focus-visible:ring-2 focus-visible:ring-primary transition-all"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Payment Description</Label>
                            <Input
                                placeholder="e.g. Initial Milestone / Project Advancement"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="h-14 rounded-2xl border-none bg-muted/40 font-medium px-6 focus-visible:ring-2 focus-visible:ring-primary transition-all"
                            />
                        </div>

                        <div className="bg-surface-container-low p-6 rounded-[2rem] border border-muted/20 space-y-4">
                            <div className="flex justify-between items-center text-sm font-medium opacity-60 italic">
                                <span>Project Base</span>
                                <span className="font-black not-italic text-foreground">₹{amount.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm font-medium opacity-60 italic">
                                <span>Platform Fee ({clientFeeRate}%)</span>
                                <span className="font-black not-italic text-foreground">₹{fee.toLocaleString()}</span>
                            </div>
                            <Separator className="bg-muted/10" />
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-black uppercase tracking-widest text-primary">Total Commitment</span>
                                <span className="text-2xl font-black italic tracking-tighter text-primary">₹{total.toLocaleString()}</span>
                            </div>
                        </div>

                        <div className="p-6 bg-primary/5 rounded-[2rem] border border-primary/10 relative overflow-hidden group">
                            <div className="absolute -top-10 -right-10 opacity-5 group-hover:scale-110 transition-transform">
                                <ShieldCheck className="h-32 w-32 text-primary" />
                            </div>
                            <div className="flex gap-4 relative z-10">
                                <ShieldCheck className="h-6 w-6 text-primary shrink-0" />
                                <div className="space-y-1">
                                    <p className="text-xs font-black uppercase tracking-widest text-primary">Escrow Protocol Active</p>
                                    <p className="text-[11px] text-muted-foreground leading-relaxed italic">
                                        Your funds are secured by Team4Job Escrow. They will only be released to the professional upon your final approval.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <footer className="pt-2">
                        <Button 
                            className="w-full h-16 rounded-[2.5rem] bg-primary text-primary-foreground font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-primary/20 active:scale-95 transition-all group overflow-hidden relative"
                            onClick={handleAddFunds}
                            disabled={isLoading}
                        >
                            <span className="relative z-10 flex items-center justify-center">
                                {isLoading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
                                Initiate Secure Payment
                            </span>
                            <div className="absolute inset-0 bg-background/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                        </Button>
                        <p className="text-center text-[10px] font-black uppercase tracking-widest opacity-30 mt-6 italic">
                            PCI DSS Compliant • 256-bit Encryption Active
                        </p>
                    </footer>
                </div>
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
    const loading = (jobLoading && !job) || userLoading;

    // Determine Winning Bid Amount (Hoisted for Payment Action)
    const winningBidAmount = React.useMemo(() => {
        if (!job?.awardedProfessional || !bids) return null;
        const awardedId = getRefId(job.awardedProfessional);
        const winningBid = bids.find(b => getRefId(b.professional) === awardedId);
        return winningBid ? winningBid.amount : 0;
    }, [job, bids]);

    const [platformSettings, setPlatformSettings] = React.useState<PlatformSettings | null>(null);
    const [counterParty, setCounterParty] = React.useState<User | null>(null);
    const isClient = !!(user && job && (user.id === getRefId(job.client) || user.id === job.clientId));
    const awardedProfessionalId = job?.awardedProfessionalId || getRefId(job?.awardedProfessional);
    const canClientFundJob = !!(
        isClient &&
        awardedProfessionalId &&
        winningBidAmount !== null &&
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

    const [isMilestoneDialogOpen, setIsMilestoneDialogOpen] = React.useState(false);
    const [revealLoading, setRevealLoading] = React.useState(false);

    // Phase 3: Award Confirmation Ceremony
    const [selectedBidForAward, setSelectedBidForAward] = React.useState<Bid | null>(null);
    const [isAwardConfirmOpen, setIsAwardConfirmOpen] = React.useState(false);

    // AI Market Insights State
    const [marketAnalysis, setMarketAnalysis] = React.useState<any>(null);
    const [isAnalyzingMarket, setIsAnalyzingMarket] = React.useState(false);


    // Auto-trigger Market Analysis for Clients
    React.useEffect(() => {
        const analyzeMarket = async () => {
            if (!isClient || job?.status !== 'open' || (bids && bids.length > 0) || marketAnalysis || isAnalyzingMarket) return;

            // Check if job is at least 1 day old (simulated check)
            const postedDate = toDate(job?.postedAt);
            const hoursSincePosted = (Date.now() - postedDate.getTime()) / (1000 * 60 * 60);

            if (hoursSincePosted > 24 || process.env.NODE_ENV === 'development') {
                setIsAnalyzingMarket(true);
                try {
                    const res = await suggestPriceBoostAction({
                        jobTitle: job?.title,
                        jobCategory: job?.jobCategory,
                        pincode: job?.address?.cityPincode || job?.location,
                        currentBudget: job?.priceEstimate?.min || 0,
                        isUrgent: job?.isUrgent,
                        bidCount: bids?.length || 0,
                        daysSincePosted: Math.max(1, Math.floor(hoursSincePosted / 24))
                    });
                    if (res.success) {
                        setMarketAnalysis(res.data);
                    }
                } catch (e) {
                    console.error("Market analysis failed:", e);
                } finally {
                    setIsAnalyzingMarket(false);
                }
            }
        };

        analyzeMarket();
    }, [isClient, job, bids, marketAnalysis, isAnalyzingMarket]);


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
            createdAt: new Date(),
            createdBy: isClient ? 'Client' : 'Professional' as const
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
            createdAt: new Date(),
            createdBy: isClient ? 'Client' : 'Professional' as const
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
                winningBidAmount || 0,
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



    // Graceful error state if job is still missing after hydration attempts
    if (loading) {
        return <JobDetailSkeleton />;
    }

    if (!job) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-12 text-center">
                <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center animate-pulse mb-6">
                    <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
                </div>
                <h3 className="text-xl font-black italic uppercase tracking-tighter mb-2">Syncing Job Data...</h3>
                <p className="text-muted-foreground max-w-xs mx-auto">
                    The server is currently under high load. We are attempting to fetch the latest job state directly from the database...
                </p>
                <Button className="mt-8 rounded-full" onClick={() => window.location.reload()}>
                    Manual Sync
                </Button>
            </div>
        );
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
            className="max-w-full overflow-x-hidden pb-20 font-sans selection:bg-primary selection:text-white bg-surface-container-lowest text-on-surface min-h-screen relative"
        >
            {/* Immersive Background Elements */}
            <div className="absolute top-0 left-0 w-full h-[600px] bg-gradient-to-b from-primary/10 via-accent/5 to-transparent pointer-events-none" />
            <div className="absolute top-[200px] right-[-10%] w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none animate-pulse" />

            <div className="container py-12 sm:py-16 space-y-12 sm:space-y-16 px-6 sm:px-12 relative z-10">
                {/* Reschedule Banner */}
                {job.dateChangeProposal && (
                    <motion.div variants={itemVariants} className={cn(
                        "border-none p-10 md:p-14 rounded-[3.5rem] flex flex-col md:flex-row items-center justify-between gap-10 relative overflow-hidden backdrop-blur-3xl ring-1 shadow-[0_40px_100px_rgba(0,0,0,0.2)] transition-all duration-700",
                        job.dateChangeProposal.status === 'rejected' 
                            ? 'bg-destructive/10 ring-destructive/20 text-destructive' 
                            : 'bg-primary/10 ring-primary/20 text-primary'
                    )}>
                        <div className="absolute inset-0 bg-gradient-to-br from-current/5 to-transparent pointer-events-none" />
                        <div className="flex items-center gap-8 relative z-10">
                            <div className="bg-background/80 p-6 rounded-[2rem] shadow-2xl ring-1 ring-white/5">
                                {job.dateChangeProposal.status === 'rejected' ? <XCircle className="h-10 w-10 animate-pulse" /> : <Calendar className="h-10 w-10 animate-pulse" />}
                            </div>
                            <div>
                                <h2 className="font-black text-3xl md:text-4xl tracking-tighter uppercase italic leading-none mb-3">
                                    {job.dateChangeProposal.status === 'rejected' ? t('rescheduleRejected') : t('rescheduleRequest')}
                                </h2>
                                <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40 italic">
                                    {job.dateChangeProposal.status === 'rejected' ? (
                                        <span>
                                            {t('otherPartyRejected', { date: job.jobStartDate ? toDate(job.jobStartDate).toLocaleDateString() : 'Original Date' })}
                                        </span>
                                    ) : (
                                        <span>
                                            {t('proposedMoveJob', {
                                                user: job.dateChangeProposal.proposedBy,
                                                date: toDate(job.dateChangeProposal.newDate).toLocaleDateString()
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
                                    <div className="flex gap-4 relative z-10">
                                        <Button variant="ghost" className="h-16 px-10 rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] border border-current/20 hover:bg-current/10" onClick={() => handleReschedule('reject')} disabled={isLoading}>{tCommon('decline')}</Button>
                                        <Button className="h-16 px-10 rounded-[1.5rem] bg-current text-white font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-current/20 hover:scale-105 transition-all" onClick={() => handleReschedule('accept')} disabled={isLoading}>{t('acceptNewDate')}</Button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin opacity-40" />
                                        <div className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 italic">{t('waitingResponse')}</div>
                                    </div>
                                )}
                            </>
                        )}

                        {/* Rejected Actions (Dismiss) */}
                        {job.dateChangeProposal.status === 'rejected' && (
                            <div className="flex gap-4 relative z-10">
                                {isClient && (
                                    <Button variant="destructive" className="h-16 px-10 rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl" onClick={() => setIsCancelDialogOpen(true)}>
                                        {tCommon('cancel')}
                                    </Button>
                                )}
                                <Button variant="ghost" className="h-16 px-10 rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] border border-current/20 hover:bg-current/10" onClick={() => handleReschedule('dismiss')} disabled={isLoading}>
                                    {t('dismiss')}
                                </Button>
                            </div>
                        )}
                    </motion.div>
                )}

                <div className="space-y-12">
                    <div className="flex flex-col gap-6">
                        <Badge variant="outline" className="w-fit px-8 py-3 rounded-full border-primary/20 text-primary font-black text-[10px] uppercase tracking-[0.4em] bg-primary/10 backdrop-blur-md shadow-2xl">
                            TERMINAL INTEL • ID-ARK-{job.id.slice(-8).toUpperCase()}
                        </Badge>
                        <div className="flex items-start justify-between gap-12">
                            <motion.h1 
                                variants={itemVariants}
                                className="text-6xl sm:text-8xl md:text-[9.5rem] font-black tracking-tighter overflow-wrap-anywhere bg-gradient-to-br from-foreground to-foreground/40 bg-clip-text text-transparent italic leading-[0.82] uppercase" 
                                data-testid="job-title"
                            >
                                {job.title}
                            </motion.h1>
                            <div className="hidden lg:block pt-8">
                                <Sparkles className="h-24 w-24 text-primary animate-pulse opacity-40" />
                            </div>
                        </div>
                    </div>
                    
                    <motion.div variants={itemVariants} className="flex flex-col gap-10">
                        <div className="flex flex-wrap items-center gap-6">
                            <Badge variant={getStatusVariant(job.status)} className="px-8 py-4 rounded-full font-black text-[11px] uppercase tracking-[0.3em] shadow-[0_20px_40px_rgba(0,0,0,0.1)] border-none ring-1 ring-white/10" data-testid="job-status-badge" data-status={job.status}>
                                {job.status.replace(/_/g, ' ').toUpperCase()}
                            </Badge>
                            {(job.status?.toLowerCase() === 'funded' || job.status?.toLowerCase() === 'in_progress' || job.status?.toLowerCase() === 'in progress') && (
                                <Badge className="bg-success text-white flex items-center gap-3 px-8 py-4 rounded-full font-black text-[11px] uppercase tracking-[0.3em] shadow-2xl ring-1 ring-success/30 backdrop-blur-md italic">
                                    <ShieldCheck className="h-5 w-5" />
                                    SECURE ESCROW ACTIVE
                                </Badge>
                            )}
                        </div>
                        <div className="relative group">
                            <div className="absolute inset-0 bg-primary/5 rounded-[3.5rem] blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                            <Card className="border-none shadow-[0_40px_100px_rgba(0,0,0,0.15)] bg-surface-container-low/40 backdrop-blur-3xl rounded-[3rem] overflow-hidden ring-1 ring-white/5 relative z-10 transition-all duration-500 hover:ring-white/10">
                                <div className="h-2 w-full bg-gradient-to-r from-primary via-accent to-primary animate-gradient-x opacity-20" />
                                <CardContent className="p-12 sm:p-16">
                                    <JobTimeline status={job.status} userRole={isClient ? 'Client' : 'Professional'} />
                                </CardContent>
                            </Card>
                        </div>
                    </motion.div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 sm:gap-16 items-start">
                    <div className="lg:col-span-2 space-y-12 sm:space-y-20 order-2 lg:order-1">
                        <motion.div variants={itemVariants}>
                            <Card className="border-none shadow-[0_40px_100px_rgba(0,0,0,0.1)] bg-surface-container-low/40 backdrop-blur-3xl rounded-[3rem] overflow-hidden ring-1 ring-white/5 relative">
                                <div className="absolute top-0 right-0 p-16 opacity-5 scale-150 rotate-12 pointer-events-none">
                                    <TrendingUp className="h-48 w-48 text-primary" />
                                </div>
                                <CardHeader className="p-12 sm:p-16 pb-10 relative z-10">
                                    <div className="flex items-center gap-6">
                                        <CardTitle className="text-4xl md:text-5xl font-black tracking-tighter italic uppercase bg-gradient-to-br from-foreground to-foreground/40 bg-clip-text text-transparent leading-none">
                                            Mission Intelligence Brief
                                        </CardTitle>
                                        <div className="h-1.5 flex-1 bg-gradient-to-r from-primary/20 to-transparent rounded-full shadow-inner" />
                                    </div>
                                </CardHeader>
                                <CardContent className="p-12 sm:p-16 pt-0 relative z-10">
                                    <p className="whitespace-pre-line mb-16 text-2xl leading-[1.6] opacity-90 font-medium tracking-tight text-foreground/90">{job.description}</p>

                                    {/* Attachments Grid */}
                                    {job.attachments && job.attachments.length > 0 && (
                                        <div className="space-y-10 bg-surface-container-high/40 p-12 rounded-[3rem] ring-1 ring-white/5 shadow-inner">
                                            <div className="flex items-center gap-4">
                                                <h4 className="text-[12px] font-black uppercase tracking-[0.4em] text-muted-foreground italic">
                                                    Project Cryptos ({job.attachments.length})
                                                </h4>
                                                <Paperclip className="h-5 w-5 text-primary opacity-40" />
                                            </div>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-8">
                                                {job.attachments.map((file: any, idx: number) => (
                                                    <motion.div 
                                                        whileHover={{ scale: 1.05, y: -5 }}
                                                        key={idx} 
                                                        className="relative group aspect-square rounded-[2rem] overflow-hidden border-none bg-background/40 cursor-pointer shadow-2xl ring-1 ring-white/5"
                                                        onClick={() => window.open(file.fileUrl, '_blank')}
                                                    >
                                                        {file.fileType.startsWith('image/') ? (
                                                            <Image
                                                                src={file.fileUrl}
                                                                alt={file.fileName}
                                                                fill
                                                                className="object-cover transition-transform duration-700 group-hover:scale-110"
                                                                sizes="(max-width: 768px) 50vw, 25vw"
                                                            />
                                                        ) : (
                                                            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                                                                <FileIcon className="h-14 w-14 mb-4 text-primary opacity-40" />
                                                                <span className="truncate w-full text-[10px] font-black uppercase tracking-[0.2em] opacity-40">{file.fileName}</span>
                                                            </div>
                                                        )}
                                                        <div className="absolute inset-0 bg-primary/40 opacity-0 group-hover:opacity-100 transition-all duration-500 flex items-center justify-center backdrop-blur-sm">
                                                            <div className="h-16 w-16 flex items-center justify-center rounded-2xl bg-background/20 backdrop-blur-md shadow-2xl border border-white/20 scale-50 group-hover:scale-100 transition-transform duration-500">
                                                                <Zap className="h-10 w-10 text-white animate-pulse" />
                                                            </div>
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
                            <Card className="border-none shadow-[0_40px_100px_rgba(0,0,0,0.1)] bg-surface-container-low/40 backdrop-blur-3xl rounded-[3rem] overflow-hidden ring-1 ring-white/5">
                                <CardHeader className="p-12 sm:p-16 pb-10">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-4xl md:text-5xl font-black tracking-tighter italic uppercase bg-gradient-to-br from-foreground to-foreground/40 bg-clip-text text-transparent leading-none flex items-center gap-6 flex-1">
                                            Logistics Queue ({bids.length})
                                            <div className="h-1.5 flex-1 bg-gradient-to-r from-primary/20 to-transparent rounded-full shadow-inner" />
                                        </CardTitle>
                                        <div className="bg-primary/10 p-5 rounded-[2rem] shadow-2xl ring-1 ring-primary/20 text-primary animate-pulse ml-8">
                                            <Users className="h-10 w-10" />
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-12 sm:p-16 pt-0">
                                    {isClient && marketAnalysis && bids.length === 0 && (
                                        <div className="mb-14 p-12 bg-gradient-to-br from-indigo-500/10 via-blue-500/10 to-accent/10 border-none rounded-[3.5rem] relative overflow-hidden group ring-1 ring-indigo-500/20 shadow-[0_40px_100px_rgba(0,0,0,0.1)]">
                                            <div className="absolute -top-16 -right-16 p-6 opacity-5 group-hover:scale-110 transition-all duration-1000 rotate-12">
                                                <TrendingUp className="h-64 w-64 text-indigo-500" />
                                            </div>
                                            <div className="relative z-10 space-y-10">
                                                <div className="flex items-center gap-5">
                                                    <div className="bg-indigo-500 p-4 rounded-[1.5rem] shadow-2xl shadow-indigo-500/40 ring-1 ring-white/20">
                                                        <Sparkles className="h-8 w-8 text-white animate-pulse" />
                                                    </div>
                                                    <h4 className="font-black text-[12px] uppercase tracking-[0.5em] text-indigo-500 italic">Predictive Market Intelligence</h4>
                                                </div>
                                                <p className="text-2xl md:text-3xl font-medium leading-relaxed opacity-90 text-foreground italic tracking-tight underline decoration-indigo-500/20 underline-offset-8">
                                                    &quot;{marketAnalysis.reasoning}&quot;
                                                </p>
                                                <div className="bg-background/40 backdrop-blur-3xl p-10 rounded-[3rem] border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-12 shadow-2xl ring-1 ring-white/5">
                                                    <div className="flex items-center gap-8">
                                                        <div className="bg-indigo-500/10 p-5 rounded-[2rem] ring-1 ring-indigo-500/20">
                                                            <Zap className="h-12 w-12 text-indigo-500" />
                                                        </div>
                                                        <div>
                                                            <p className="text-[11px] font-black text-indigo-500 uppercase tracking-[0.4em] opacity-60 mb-2">Strategic Command</p>
                                                            <p className="font-black text-3xl italic tracking-tighter uppercase leading-none">{marketAnalysis.recommendedAction}</p>
                                                        </div>
                                                    </div>
                                                    <Button className="h-20 px-14 rounded-[1.5rem] bg-indigo-500 hover:bg-indigo-600 text-white font-black text-xs uppercase tracking-[0.3em] shadow-[0_20px_60px_-10px_rgba(99,102,241,0.5)] transition-all active:scale-95 group/boost">
                                                        <span className="relative z-10">Enable High-Authority Boost</span>
                                                        <div className="absolute inset-0 bg-background/20 translate-y-full group-hover/boost:translate-y-0 transition-transform duration-500" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {bids.length === 0 ? (
                                        <div className="py-32 text-center flex flex-col items-center justify-center gap-6">
                                            <div className="p-10 bg-muted/20 backdrop-blur-md rounded-[3rem] shadow-inner">
                                                <Hourglass className="h-16 w-16 opacity-10 animate-pulse" />
                                            </div>
                                            <p className="text-[12px] font-black uppercase tracking-[0.5em] opacity-30 italic">Awaiting technical proposals...</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-10">
                                            <AnimatePresence mode="popLayout">
                                                {bids.map((bid, index) => {
                                                    const professional = typeof bid.professional === 'object' ? bid.professional as User : null;
                                                    const profTier = professional?.professionalProfile?.tierPriority || 1;
                                                    const profName = professional?.name || "Professional";
                                                    const profAvatar = professional?.avatarUrl;

                                                    return (
                                                        <motion.div 
                                                            key={bid.id}
                                                            initial={{ opacity: 0, scale: 0.95 }}
                                                            animate={{ opacity: 1, scale: 1 }}
                                                            exit={{ opacity: 0, scale: 0.9 }}
                                                            transition={{ delay: index * 0.05, duration: 0.4, ease: "circOut" }}
                                                            className="group relative"
                                                        >
                                                            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 rounded-[3.5rem] opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                                                            <div className={cn(
                                                                "relative p-8 sm:p-12 rounded-[3rem] border border-white/5 bg-background/20 backdrop-blur-3xl transition-all duration-500 group-hover:shadow-[0_40px_100px_rgba(0,0,0,0.1)] group-hover:ring-white/10 flex flex-col md:flex-row justify-between items-center gap-10",
                                                                job.awardedProfessionalId === getRefId(bid.professional) && "ring-2 ring-primary bg-primary/5"
                                                            )}>
                                                                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-10 w-full md:w-auto text-center sm:text-left">
                                                                    <div className="relative">
                                                                        <Avatar className="h-32 w-32 border-8 border-background/20 shadow-2xl transition-transform duration-700 group-hover:scale-110">
                                                                            <AvatarImage src={profAvatar} alt={profName} />
                                                                            <AvatarFallback className="font-black text-4xl bg-primary/10 text-primary">
                                                                                {profName?.substring(0, 2).toUpperCase()}
                                                                            </AvatarFallback>
                                                                        </Avatar>
                                                                        <div className="absolute -bottom-4 -right-4 p-3 rounded-[1.5rem] bg-background shadow-2xl border border-white/5 scale-125">
                                                                            {(() => {
                                                                                const tierName = profTier === 4 ? "Platinum" : profTier === 3 ? "Gold" : profTier === 2 ? "Silver" : "Bronze";
                                                                                return tierIcons[tierName as keyof typeof tierIcons] || <Star className="h-6 w-6 text-primary" />;
                                                                            })()}
                                                                        </div>
                                                                    </div>
                                                                    
                                                                    <div className="space-y-6">
                                                                        <div className="space-y-2">
                                                                            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                                                                                <h4 className="text-3xl font-black tracking-tighter uppercase italic">{profName}</h4>
                                                                                <Badge variant="outline" className="text-[10px] uppercase font-black tracking-[0.3em] px-4 py-1.5 border-primary/20 bg-primary/10 text-primary rounded-full">
                                                                                    {profTier === 4 ? "PLATINUM OPS" : profTier === 3 ? "GOLD GRADE" : profTier === 2 ? "SILVER TIER" : "INITIATE"}
                                                                                </Badge>
                                                                            </div>
                                                                            <div className="flex items-center justify-center sm:justify-start gap-2 text-[11px] font-black uppercase text-success tracking-[0.2em] italic">
                                                                                <ShieldCheck className="h-4 w-4" />
                                                                                TERMINAL-VERIFIED LOGISTICIAN
                                                                            </div>
                                                                        </div>
                                                                        
                                                                        <div className="flex flex-col bg-surface-container-high/40 p-6 rounded-[2rem] border border-white/5 shadow-inner">
                                                                            <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30 mb-1">Proposed Commitment</span>
                                                                            <div className="flex items-baseline gap-2">
                                                                                <span className="text-4xl font-black tracking-tighter italic text-foreground" data-testid="bid-amount">
                                                                                    {isClient || user?.id === getRefId(bid.professional) ? `₹${bid.amount.toLocaleString()}` : "₹ ••••"}
                                                                                </span>
                                                                                <span className="text-[11px] font-black uppercase tracking-widest opacity-20">
                                                                                    {formatDistanceToNow(toDate(bid.timestamp))} ago
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
                                                                    <Button
                                                                        variant="ghost"
                                                                        className="w-full sm:w-auto h-16 px-10 rounded-[1.5rem] bg-background/5 hover:bg-background/10 text-[11px] font-black uppercase tracking-[0.3em] transition-all group/btn"
                                                                        onClick={() => {
                                                                            const contactUrl = `/dashboard/messages?recipientId=${getRefId(bid.professional)}`;
                                                                            window.open(contactUrl, '_blank');
                                                                        }}
                                                                    >
                                                                        <MessageSquare className="h-5 w-5 mr-3 text-primary opacity-40 group-hover/btn:opacity-100 transition-opacity" />
                                                                        Initiate Comms
                                                                    </Button>

                                                                    {isClient && job.status?.toLowerCase() === 'open' && (
                                                                        <Button 
                                                                            data-testid="send-offer-button" 
                                                                            className="w-full sm:w-auto h-16 px-12 rounded-[1.5rem] bg-primary text-primary-foreground font-black text-[11px] uppercase tracking-[0.3em] shadow-2xl shadow-primary/30 hover:scale-105 active:scale-95 transition-all overflow-hidden relative group/award"
                                                                            onClick={() => {
                                                                                setSelectedBidForAward(bid as Bid);
                                                                                setIsAwardConfirmOpen(true);
                                                                            }}
                                                                        >
                                                                            <span className="relative z-10 flex items-center">
                                                                                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Authorize Offer"}
                                                                            </span>
                                                                            <div className="absolute inset-0 bg-background/20 translate-y-full group-hover/award:translate-y-0 transition-transform duration-500" />
                                                                        </Button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    );
                                                })}
                                            </AnimatePresence>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </motion.div>
                          <div className="space-y-8 sm:space-y-12 order-1 lg:order-2 lg:sticky lg:top-24 h-fit">
                        {/* Actions Panel */}
                        <motion.div variants={itemVariants} className="sticky top-24">
                            <Card data-testid="actions-panel" className="border-none shadow-[0_40px_100px_rgba(0,0,0,0.2)] bg-surface-container-highest dark:bg-slate-900 rounded-[3.5rem] overflow-hidden ring-1 ring-white/10 backdrop-blur-3xl">
                                <div className="h-2 w-full bg-gradient-to-r from-primary via-accent to-primary animate-gradient-x opacity-40" />
                                <CardHeader className="p-10 sm:p-12 pb-8">
                                    <div className="flex items-center gap-5">
                                        <div className="bg-primary/10 p-4 rounded-[1.5rem] ring-1 ring-primary/20 shadow-2xl">
                                            <Zap className="h-8 w-8 text-primary animate-pulse" />
                                        </div>
                                        <CardTitle className="text-3xl font-black tracking-tighter italic uppercase bg-gradient-to-br from-foreground to-foreground/40 bg-clip-text text-transparent leading-none">Mission Controls</CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-10 space-y-6">
                                    <div className={cn("space-y-6", userLoading && "opacity-50 pointer-events-none")}>
                                        {userLoading && (
                                            <div className="flex items-center justify-center py-6 bg-background/20 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.3em] opacity-60">
                                                <Loader2 className="h-4 w-4 mr-3 animate-spin" />
                                                Syncing Authorizations
                                            </div>
                                        )}

                                        {/* Client Actions */}
                                        {isClient && job.status?.toLowerCase() === 'open' && (
                                            <Button variant="destructive" className="w-full h-16 rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-destructive/20 border-none" onClick={() => handleJobUpdate({ status: 'unbid' })}>
                                                Close Operations
                                            </Button>
                                        )}

                                        {/* Professional Actions: Place Bid */}
                                        {!isClient && job.status?.toLowerCase() === 'open' && (
                                            <Button 
                                                className="w-full h-20 rounded-[1.5rem] bg-primary text-primary-foreground font-black text-sm uppercase tracking-[0.2em] shadow-[0_20px_40px_rgba(var(--primary-rgb),0.3)] group overflow-hidden relative" 
                                                onClick={() => setIsBidDialogOpen(true)} 
                                                disabled={userLoading || bids.some(b => getRefId(b.professional) === user?.id)} 
                                                data-testid="place-bid-button"
                                            >
                                                <span className="relative z-10">{bids.some(b => getRefId(b.professional) === user?.id) ? "Proposal Submitted" : "Submit Technical Bid"}</span>
                                                <div className="absolute inset-0 bg-background/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                                            </Button>
                                        )}

                                        {/* Reschedule Action */}
                                        {job.status === 'in_progress' && !job.workStartedAt && !job.dateChangeProposal?.status.includes('pending') && (
                                            <Button variant="outline" className="w-full h-16 rounded-[1.5rem] border border-white/10 bg-background/5 font-black text-xs uppercase tracking-[0.2em] hover:bg-background/10" onClick={() => setIsRescheduleDialogOpen(true)}>
                                                <Calendar className="mr-3 h-5 w-5 opacity-40" />
                                                Adjust Logistics
                                            </Button>
                                        )}

                                        {/* Retract Offer */}
                                        {isClient && job.status?.toLowerCase() === 'bid_accepted' && (
                                            <div className="space-y-6">
                                                <div className="p-8 bg-warning/5 border border-warning/10 rounded-[2rem] text-[11px] font-black uppercase tracking-[0.2em] text-warning italic leading-relaxed text-center">
                                                    Authorization Pending Receipt
                                                </div>
                                                <Button
                                                    variant="outline"
                                                    className="w-full h-16 rounded-[1.5rem] border-2 border-warning/20 bg-background/50 text-warning hover:bg-warning/10 font-black text-xs uppercase tracking-[0.2em]"
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
                                                    <UserX className="mr-3 h-5 w-5" />
                                                    Retract Authorization
                                                </Button>
                                            </div>
                                        )}

                                        {canClientFundJob && (
                                            isPaymentsEnabled ? (
                                                <Button className="w-full h-20 rounded-[1.5rem] bg-success text-white font-black text-sm uppercase tracking-[0.2em] shadow-[0_20px_50px_rgba(var(--success-rgb),0.3)] hover:scale-[1.02] transition-all" onClick={handleStartCheckout} data-testid="proceed-payment-button">
                                                    Initiate Funding Protocol
                                                </Button>
                                            ) : (
                                                <div className="p-8 bg-muted/20 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.3em] opacity-40 text-center italic border border-white/5">
                                                    Terminal Payment Node Offline
                                                </div>
                                            )
                                        )}

                                        {/* Release Payment */}
                                        {isClient && (job.status?.toLowerCase() === 'work_submitted' || job.status?.toLowerCase() === 'work submitted') && (
                                            isPaymentsEnabled ? (
                                                <Button className="w-full h-20 rounded-[1.5rem] bg-success text-white font-black text-sm uppercase tracking-[0.2em] shadow-2xl shadow-success/30" onClick={() => setIsReleaseDialogOpen(true)} data-testid="approve-work-button">
                                                    <CheckCircle className="mr-3 h-6 w-6" />
                                                    Approve & Release
                                                </Button>
                                            ) : (
                                                <Button className="w-full h-16 rounded-[1.5rem] bg-muted text-muted-foreground font-black text-xs uppercase tracking-[0.2em]" disabled>
                                                    Secure Node Offline
                                                </Button>
                                            )
                                        )}

                                        {/* Raise Dispute */}
                                        {(job.status?.toLowerCase() === 'in_progress' || job.status?.toLowerCase() === 'in progress' || job.status?.toLowerCase() === 'work_submitted' || job.status?.toLowerCase() === 'work submitted') && (
                                            isDisputesEnabled ? (
                                                <Button variant="ghost" className="w-full h-16 rounded-[1.5rem] bg-destructive/5 text-destructive hover:bg-destructive/10 font-black text-xs uppercase tracking-[0.2em] border border-destructive/10" onClick={() => setIsDisputeDialogOpen(true)}>
                                                    <ShieldAlert className="mr-3 h-5 w-5" />
                                                    Flag Discrepancy
                                                </Button>
                                            ) : null
                                        )}

                                        {/* Leave Review */}
                                        {job.status?.toLowerCase() === 'completed' && (
                                            <div className="space-y-4">
                                                <Button className="w-full h-16 rounded-[1.5rem] border border-white/10 bg-background/40 backdrop-blur-md font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-primary/5 group" variant="outline" onClick={() => setIsReviewDialogOpen(true)} data-testid="leave-review-button">
                                                    <Star className="mr-3 h-5 w-5 text-warning group-hover:scale-125 transition-transform" />
                                                    Submit Performance Intel
                                                </Button>

                                                <Button
                                                    className="w-full h-16 rounded-[1.5rem] border border-white/10 bg-background/40 backdrop-blur-md font-black text-xs uppercase tracking-[0.2em] shadow-2xl group"
                                                    variant="secondary"
                                                    onClick={() => window.open(`/dashboard/jobs/${job.id}/invoice`, '_blank')}
                                                    data-testid="download-invoice-button"
                                                >
                                                    <FileText className="mr-3 h-5 w-5 text-primary group-hover:rotate-12 transition-transform" />
                                                    Download Mission Invoice
                                                </Button>

                                                <Button
                                                    className="w-full h-12 rounded-[1.5rem] border-none bg-transparent hover:bg-background/5 font-black text-[9px] uppercase tracking-[0.4em] opacity-40 italic mt-2"
                                                    variant="ghost"
                                                    onClick={() => window.open(`/dashboard/jobs/${job.id}/invoice?type=platform`, '_blank')}
                                                    data-testid="download-platform-invoice-button"
                                                >
                                                    Platform Receipt Storage
                                                </Button>
                                            </div>
                                        )}

                                        {/* Secure Contact Reveal */}
                                        {revealLoading && <div className="py-6 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}
                                        {counterParty && (
                                            <div className="space-y-6 pt-4">
                                                <div className="bg-surface-container-high/40 rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/5">
                                                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-5 text-white">
                                                        <h4 className="font-black text-[11px] uppercase tracking-[0.4em] flex items-center italic">
                                                            <ShieldCheck className="h-4 w-4 mr-3" />
                                                            ID VERIFIED TERMINAL
                                                        </h4>
                                                    </div>
                                                    <div className="p-8 flex items-center gap-6">
                                                        <Avatar className="h-20 w-20 border-4 border-background/20 shadow-2xl">
                                                            <AvatarImage src={counterParty.realAvatarUrl || counterParty.avatarUrl} />
                                                            <AvatarFallback className="font-black text-2xl bg-primary/10 text-primary">{counterParty.name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <p className="font-black text-2xl tracking-tighter italic leading-none mb-1 uppercase">{counterParty.name}</p>
                                                            <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 mb-3">{isClient ? "Strategic Partner" : "Initiator"}</p>
                                                            <div className="flex items-center gap-2 text-[10px] text-success font-black uppercase tracking-[0.2em] italic">
                                                                <CheckCircle2 className="h-3.5 w-3.5" />
                                                                Background Verified
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {counterParty.mobile && (
                                                        <div className="bg-background/40 p-8 border-t border-white/5">
                                                            <a href={`tel:${counterParty.mobile}`} className="flex flex-col gap-2 group">
                                                                <span className="text-[9px] font-black uppercase tracking-[0.5em] opacity-30">{t('mobileContact')}</span>
                                                                <span className="text-2xl font-black tracking-tighter italic text-primary group-hover:underline underline-offset-8 transition-all">
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
                                            !isClient && job.status?.toLowerCase() === 'bid_accepted' && (
                                                <ProfessionalAcceptanceSection job={job} user={user!} onJobUpdate={handleJobUpdate} />
                                            )
                                        }

                                        {/* Completion Sections */}
                                        {
                                            !isClient && (job.status?.toLowerCase() === 'in_progress' || job.status?.toLowerCase() === 'in progress' || job.status?.toLowerCase() === 'bid_accepted' || job.status?.toLowerCase() === 'pending funding') && !job.workStartedAt && (
                                                <StartWorkInput job={job} user={user!} onJobUpdate={handleJobUpdate} />
                                            )
                                        }

                                        {
                                            !isClient && (job.status?.toLowerCase() === 'in_progress' || job.status?.toLowerCase() === 'in progress') && job.workStartedAt && (
                                                <ProfessionalCompletionSection 
                                                    job={job} 
                                                    user={user!} 
                                                    onJobUpdate={handleJobUpdate} 
                                                    onSubmitWork={async (attachments) => {
                                                        const res = await submitWorkAction(job.id, user!.id, attachments);
                                                        if (!res.success) throw new Error(res.error);
                                                    }}
                                                />
                                            )
                                        }

                                        {
                                            isClient && (job.status?.toLowerCase() === 'in_progress' || job.status?.toLowerCase() === 'in progress' || job.status?.toLowerCase() === 'work_submitted' || job.status?.toLowerCase() === 'work submitted' || job.status?.toLowerCase() === 'pending confirmation') && (
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
                                            job.status?.toLowerCase() === 'completed' && (
                                                <RatingSection job={job} onJobUpdate={handleJobUpdate} />
                                            )
                                        }
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </div>
                </div>

                <FundingBreakdownDialog
                        open={isPaymentDialogOpen}
                        onOpenChange={setIsPaymentDialogOpen}
                        job={job}
                        onConfirm={handleConfirmPayment}
                        onDirectConfirm={handleDirectConfirm}
                        platformSettings={platformSettings}
                        bidAmount={winningBidAmount || 0}
                    />

                {/* Variation Orders Section */}
                <div className="md:col-span-3 mt-20 order-3">
                    <Card className="border-none shadow-[0_40px_100px_rgba(0,0,0,0.1)] bg-surface-container-low/40 backdrop-blur-3xl rounded-[3rem] overflow-hidden ring-1 ring-white/5 relative group">
                        <div className="absolute top-0 right-0 p-12 opacity-5 scale-150 -rotate-12 pointer-events-none group-hover:rotate-0 transition-transform duration-1000">
                            <Plus className="h-32 w-32 text-primary" />
                        </div>
                        <CardHeader className="p-12 sm:p-16 pb-12 flex flex-col md:flex-row items-center justify-between relative z-10 gap-10">
                            <div className="flex items-center gap-6 flex-1 w-full">
                                <CardTitle className="text-4xl md:text-5xl font-black tracking-tighter italic uppercase bg-gradient-to-br from-foreground to-foreground/40 bg-clip-text text-transparent leading-none">Mission Variation Commands</CardTitle>
                                <div className="h-1.5 flex-1 bg-gradient-to-r from-primary/20 to-transparent rounded-full shadow-inner" />
                            </div>
                            <Button 
                                onClick={() => setIsVariationDialogOpen(true)} 
                                className="h-18 px-12 rounded-[1.5rem] bg-background/40 hover:bg-background/80 border border-white/10 text-primary font-black text-xs uppercase tracking-[0.3em] shadow-[0_20px_40px_rgba(0,0,0,0.1)] transition-all active:scale-95 group/var"
                                data-testid="propose-variation-button"
                            >
                                <Plus className="h-6 w-6 mr-4 group-hover:rotate-180 transition-transform duration-700" />
                                {isClient ? "Initiate Request" : "Submit Proposal"}
                            </Button>
                        </CardHeader>
                        <CardContent className="p-12 sm:p-16 pt-0 relative z-10">
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
                    <div className="md:col-span-3 mt-20 order-4">
                        <Card className="border-none shadow-[0_40px_100px_rgba(0,0,0,0.1)] bg-surface-container-low/40 backdrop-blur-3xl rounded-[3rem] overflow-hidden ring-1 ring-white/5 relative group">
                            <div className="absolute top-0 right-0 p-12 opacity-5 scale-150 -rotate-12 pointer-events-none group-hover:rotate-0 transition-transform duration-1000">
                                <CheckCircle2 className="h-32 w-32 text-success" />
                            </div>
                            <CardHeader className="p-12 sm:p-16 pb-12 flex flex-col md:flex-row items-center justify-between relative z-10 gap-10">
                                <div className="flex items-center gap-6 flex-1 w-full">
                                    <CardTitle className="text-4xl md:text-5xl font-black tracking-tighter italic uppercase bg-gradient-to-br from-foreground to-foreground/40 bg-clip-text text-transparent leading-none">Financial Milestones</CardTitle>
                                    <div className="h-1.5 flex-1 bg-gradient-to-r from-primary/20 to-transparent rounded-full shadow-inner" />
                                </div>
                                {isClient && (job.status?.toLowerCase() === 'in_progress' || job.status?.toLowerCase() === 'in progress') && (
                                    ((bids.find(b => getRefId(b.professional) === (typeof job.awardedProfessional === 'string' ? job.awardedProfessional : getRefId(job.awardedProfessional)))?.amount || (job as any).priceEstimate?.min || (job as any).budget || 0) >= (platformSettings?.minJobBudgetForMilestones ?? 5000))
                                        ? (
                                            <Button 
                                                onClick={() => setIsMilestoneDialogOpen(true)} 
                                                className="h-18 px-12 rounded-[1.5rem] bg-background/40 hover:bg-background/80 border border-white/10 text-primary font-black text-xs uppercase tracking-[0.3em] shadow-[0_20px_40px_rgba(0,0,0,0.1)] transition-all active:scale-95 group/mile"
                                                data-testid="add-milestone-button"
                                            >
                                                <PlusCircle className="h-6 w-6 mr-4 group-hover:scale-125 transition-transform duration-700" />
                                                Add Protocol
                                            </Button>
                                        ) : (
                                            <div className="bg-muted/10 px-10 py-5 rounded-full text-[10px] font-black uppercase tracking-[0.4em] opacity-40 italic border border-white/5 shadow-inner">
                                                Protocol Threshold Not Met
                                            </div>
                                        )
                                )}
                            </CardHeader>
                            <CardContent className="p-12 sm:p-16 pt-0 relative z-10">
                                <MilestoneList
                                    job={job}
                                    user={user || null}
                                    isClient={isClient}
                                    onRelease={handleReleaseMilestone}
                                />
                            </CardContent>
                        </Card>
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
                        (job.status?.toLowerCase() === 'in_progress' || job.status?.toLowerCase() === 'in progress' || job.status?.toLowerCase() === 'work_submitted' || job.status?.toLowerCase() === 'work submitted' || job.status?.toLowerCase() === 'completed') && user && isDisputesEnabled && (
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

                    <Dialog open={isAwardConfirmOpen} onOpenChange={setIsAwardConfirmOpen}>
                        <DialogContent className="max-w-2xl p-0 overflow-hidden border-none rounded-[3rem] bg-background font-sans shadow-2xl">
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 pointer-events-none" />
                            <div className="relative p-10 space-y-8">
                                <header className="text-center space-y-4">
                                    <div className="inline-flex items-center justify-center h-20 w-20 rounded-[2rem] bg-primary/10 text-primary shadow-inner mb-2 animate-bounce-subtle">
                                        <Trophy className="h-10 w-10" />
                                    </div>
                                    <DialogTitle className="text-4xl font-black tracking-tighter italic uppercase bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent">
                                        {t('awardJob')}
                                    </DialogTitle>
                                    <p className="text-muted-foreground font-medium text-lg leading-relaxed max-w-md mx-auto">
                                        Confirming this award establishes a secure production link with your chosen professional.
                                    </p>
                                </header>

                                {selectedBidForAward && (
                                    <div className="bg-surface-container-low p-8 rounded-[2.5rem] border border-muted/20 shadow-xl shadow-black/5 space-y-6 relative overflow-hidden group">
                                        <div className="absolute -top-12 -right-12 p-4 opacity-5 group-hover:scale-110 transition-transform rotate-12">
                                            <ShieldCheck className="h-40 w-40 text-primary" />
                                        </div>
                                        
                                        <div className="flex items-center gap-6 relative z-10">
                                            <Avatar className="h-20 w-20 border-4 border-background shadow-lg ring-2 ring-primary/20">
                                                <AvatarImage src={(selectedBidForAward.professional as User)?.avatarUrl} />
                                                <AvatarFallback className="bg-primary/5 text-primary text-2xl font-black">
                                                    {(selectedBidForAward.professional as User)?.name?.substring(0, 2).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <h4 className="text-2xl font-black italic">{(selectedBidForAward.professional as User)?.name}</h4>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 bg-success/10 text-success border-success/20">
                                                        Top Candidate
                                                    </Badge>
                                                    <span className="text-xs text-muted-foreground font-black uppercase tracking-widest flex items-center gap-1">
                                                        <IndianRupee className="h-3 w-3" />
                                                        {selectedBidForAward.amount}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <Separator className="bg-muted/10" />

                                        <div className="grid grid-cols-2 gap-4 relative z-10">
                                            <div className="p-5 rounded-3xl bg-background/50 border border-muted/10 group-hover:border-success/20 transition-colors">
                                                <ShieldCheck className="h-5 w-5 text-success mb-2" />
                                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Escrow Security</p>
                                                <p className="text-sm font-semibold italic">Funds held safely</p>
                                            </div>
                                            <div className="p-5 rounded-3xl bg-background/50 border border-muted/10 group-hover:border-amber-500/20 transition-colors">
                                                <Zap className="h-5 w-5 text-amber-500 mb-2" />
                                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Satisfaction</p>
                                                <p className="text-sm font-semibold italic">Pay only if happy</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <footer className="pt-2">
                                    <div className="flex flex-col sm:flex-row items-center gap-4">
                                        <Button 
                                            variant="ghost" 
                                            className="w-full sm:flex-1 h-16 rounded-[2rem] font-black text-[11px] uppercase tracking-[0.3em] hover:bg-muted/20 opacity-60"
                                            onClick={() => setIsAwardConfirmOpen(false)}
                                        >
                                            Abort Selection
                                        </Button>
                                        <Button 
                                            className="w-full sm:flex-[2] h-16 rounded-[2rem] bg-primary text-primary-foreground font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-primary/30 active:scale-95 transition-all group overflow-hidden relative"
                                            onClick={async () => {
                                                if (!selectedBidForAward) return;
                                                const acceptanceDeadline = new Date();
                                                acceptanceDeadline.setHours(acceptanceDeadline.getHours() + 24);
                                                const professionalId = selectedBidForAward.professionalId || getRefId(selectedBidForAward.professional);
                                                if (!professionalId) return;

                                                try {
                                                    setIsLoading(true);
                                                    const res = await awardJobAction(job.id, user!.id, professionalId, acceptanceDeadline.toISOString());
                                                    if (res.success) {
                                                        toast({ 
                                                            title: "MISSION AUTHORIZED", 
                                                            description: "The technical liaison has been notified of your selection.",
                                                            className: "bg-surface-container-highest text-foreground border-primary/20 rounded-[2rem] font-black uppercase tracking-tight shadow-2xl"
                                                        });
                                                        setIsAwardConfirmOpen(false);
                                                    } else {
                                                        throw new Error(res.error);
                                                    }
                                                } catch (err: any) {
                                                    toast({ title: "AUTHORIZATION FAILED", description: err.message, variant: "destructive" });
                                                } finally {
                                                    setIsLoading(false);
                                                }
                                            }}
                                            disabled={isLoading}
                                        >
                                            <span className="relative z-10">
                                                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Official Authorization"}
                                            </span>
                                            <div className="absolute inset-0 bg-background/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                                        </Button>
                                    </div>
                                    <p className="text-center text-[10px] font-black uppercase tracking-[0.4em] opacity-20 mt-8 italic">
                                        Team4Job Secure Transaction Protocol V2.1 • Multi-tier Verification Active
                                    </p>
                                </footer>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>
        </motion.div>
    );
}
