
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";


declare const cashfree: any;

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
        toast({ title: "Thank you for your feedback!", description: "Your rating has been submitted.", variant: "success" });
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

function InstallerCompletionSection({ job, user, onJobUpdate }: { job: Job, user: User, onJobUpdate: (updatedJob: Partial<Job>) => void }) {
  const { toast } = useToast();
  const { db, storage } = useFirebase();
  const [otp, setOtp] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [completionFiles, setCompletionFiles] = React.useState<File[]>([]);

  const handleCompleteJob = async () => {
    if (otp !== job.completionOtp) {
      toast({
        title: "Invalid OTP",
        description: "The Job Completion OTP is incorrect. Please ask the Job Giver for the correct code.",
        variant: "destructive",
      });
      return;
    }
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
        // --- 1. Upload proof of completion files ---
        const uploadPromises = completionFiles.map(async (file) => {
            const storageRef = ref(storage, `jobs/${job.id}/completion_proof/${file.name}`);
            await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(storageRef);
            return { fileName: file.name, fileUrl: downloadURL, fileType: file.type };
        });
        const uploadedAttachments = await Promise.all(uploadPromises);

        // --- 2. Find the corresponding "Funded" transaction ---
        const q = query(collection(db, "transactions"), where("jobId", "==", job.id), where("status", "==", "Funded"));
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
            throw new Error("Could not find a funded transaction for this job. Please contact support.");
        }
        const transactionDoc = querySnapshot.docs[0];
        const transactionData = transactionDoc.data() as Transaction;

        // --- 3. Call backend to release the funds from the Cashfree Marketplace Settlement account ---
        await axios.post('/api/escrow/release-funds', {
            transactionId: transactionDoc.id,
        });
        
        // --- 4. Auto-generate invoice data ---
        let invoiceData: Invoice | null = null;
        if (job.isGstInvoiceRequired) {
            const jobGiver = job.jobGiver as User;
            const awardedInstaller = job.awardedInstaller as User;
            const bidAmount = transactionData.amount;
            const tipAmount = transactionData.travelTip || 0;
            
            invoiceData = {
                id: `INV-${job.id}`,
                jobId: job.id,
                jobTitle: job.title,
                date: new Date(),
                subtotal: bidAmount,
                travelTip: tipAmount,
                totalAmount: bidAmount + tipAmount,
                from: {
                    name: awardedInstaller.name,
                    gstin: awardedInstaller.gstin || "Not Provided",
                },
                to: {
                    name: jobGiver.name,
                    gstin: jobGiver.gstin || "Not Provided",
                },
            };
        }

        // --- 5. Update Job Status and invoice data locally and in Firestore ---
        const updatedJobData: Partial<Job> = { 
            status: 'Completed', 
            attachments: arrayUnion(...uploadedAttachments) as any,
            ...(invoiceData && { invoice: invoiceData }),
        };
        onJobUpdate(updatedJobData);
        
        toast({
          title: "Job Completed!",
          description: "Payout has been initiated. The Job Giver can now rate your work.",
          variant: 'success'
        });

    } catch (error: any) {
        console.error("Error completing job:", error);
        toast({
            title: "Error Completing Job",
            description: error.response?.data?.error || "An unexpected error occurred while initiating the payout.",
            variant: "destructive",
        });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Complete This Job</CardTitle>
        <CardDescription>
          Upload proof of completion (photos/videos) and enter the 6-digit OTP from the Job Giver to mark the job as complete and trigger the payout.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
            <Label>Proof of Completion</Label>
            <FileUpload onFilesChange={setCompletionFiles} maxFiles={5} />
        </div>
        <div className="flex items-center gap-4">
          <Input
            type="text"
            placeholder="Enter 6-digit OTP"
            className="flex-1"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            maxLength={6}
          />
          <Button onClick={handleCompleteJob} disabled={otp.length !== 6 || isSubmitting}>
             {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Complete Job
          </Button>
        </div>
         {!user.payouts?.beneficiaryId && (
            <p className="text-sm text-destructive">You must set up your payout bank account in your profile before you can complete a job.</p>
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

  const isDisqualified = job.disqualifiedInstallerIds?.includes(user.id);
  
  if (isDisqualified) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Bidding Unavailable</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-destructive">You are not eligible to bid on this job because you previously declined the offer.</p>
            </CardContent>
        </Card>
    )
  }

  const handlePlaceBid = async () => {
    if (!bidAmount || !bidProposal) {
      toast({ title: "Missing Information", description: "Please provide both a bid amount and a proposal.", variant: "destructive" });
      return;
    }
    const newBid: Omit<Bid, 'id'> = {
      amount: Number(bidAmount),
      timestamp: new Date(),
      coverLetter: bidProposal,
      installer: doc(db, 'users', user.id)
    };
    
    onJobUpdate({ 
        bids: [...(job.bids || []), { ...newBid, id: 'temp-id', installer: user }], // Optimistic update
        bidderIds: [...(job.bidderIds || []), user.id] 
    });

    toast({ title: "Bid Placed!", description: "Your bid has been submitted successfully." });
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

  const commissionRate = platformSettings?.installerCommissionRate || 0;
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
                <Separator className="my-1"/>
                 <p className="font-bold text-base text-green-600">
                    ~ {earnings.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                 </p>
             </Card>
           )}
        </div>
         <Button onClick={handlePlaceBid} className="w-full md:w-auto">Place Bid</Button>
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
                placeholder="Explain why you're the best fit for this job..."
                className="min-h-32"
                value={bidProposal}
                onChange={(e) => setBidProposal(e.target.value)}
            />
        </div>
      </CardContent>
    </Card>
  );
}

function JobGiverBid({ bid, job, anonymousId, selected, onSelect, isDisabled }: { bid: Bid, job: Job, anonymousId: string, selected: boolean, onSelect: (id: string) => void, isDisabled: boolean }) {
    const { role } = useUser();
    const [timeAgo, setTimeAgo] = React.useState('');
    const installer = bid.installer as User;

    React.useEffect(() => {
        if(bid.timestamp) {
            setTimeAgo(formatDistanceToNow(toDate(bid.timestamp), { addSuffix: true }));
        }
    }, [bid.timestamp]);
    
    const isAdmin = role === 'Admin';
    const isJobGiver = role === 'Job Giver';
    const identitiesRevealed = job.status !== 'Open for Bidding' && job.status !== 'Bidding Closed' || role === 'Admin';

    const installerName = identitiesRevealed ? installer.name : anonymousId;
    const avatar = identitiesRevealed ? <AvatarImage src={installer.realAvatarUrl} alt={installer.name} /> : <AnimatedAvatar svg={installer.avatarUrl} />;
    const avatarFallback = identitiesRevealed ? installer.name.substring(0, 2) : anonymousId.split('-')[1];

    return (
        <div className={cn("p-4 rounded-lg border flex gap-4", selected && 'border-primary bg-primary/5')}>
            <Checkbox id={`select-${installer.id}`} checked={selected} onCheckedChange={() => onSelect(installer.id)} className="mt-1" disabled={isDisabled && !selected} />
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
                <p className="mt-4 text-sm text-foreground">{bid.coverLetter}</p>
            </div>
        </div>
    );
}

function BidsSection({ job, onJobUpdate, anonymousIdMap }: { job: Job, onJobUpdate: (updatedJob: Partial<Job>) => void, anonymousIdMap: Map<string, string> }) {
    const { user } = useUser();
    const { toast } = useToast();
    const router = useRouter();
    const [selectedInstallers, setSelectedInstallers] = React.useState<string[]>([]);
    const [isSendingOffers, setIsSendingOffers] = React.useState(false);
    const [isAnalyzing, setIsAnalyzing] = React.useState(false);
    const [analysisResult, setAnalysisResult] = React.useState<AnalyzeBidsOutput | null>(null);

    const isSubscribed = user?.subscription && toDate(user.subscription.expiresAt) > new Date();

    const handleSelectInstaller = (id: string) => {
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
    }

    const handleAnalyzeBids = async () => {
        if (!isSubscribed) {
            router.push('/dashboard/billing');
            return;
        }

        setIsAnalyzing(true);
        try {
            const bidderProfiles = job.bids.map(bid => {
                const installer = bid.installer as User;
                return {
                    anonymousId: anonymousIdMap.get(installer.id) || 'Unknown Bidder',
                    bidAmount: bid.amount,
                    tier: installer.installerProfile?.tier || 'Bronze',
                    rating: installer.installerProfile?.rating || 0,
                    reviewCount: installer.installerProfile?.reviews || 0,
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

    const handleSendOffers = async () => {
        if (selectedInstallers.length === 0) {
            toast({ title: "No Installers Selected", description: "Please select at least one installer to send an offer." });
            return;
        }
        setIsSendingOffers(true);
        const acceptanceDeadline = new Date();
        acceptanceDeadline.setHours(acceptanceDeadline.getHours() + 24);

        const update: Partial<Job> = {
            status: "Awarded",
            selectedInstallers: selectedInstallers.map((id, index) => ({ installerId: id, rank: index + 1 })),
            acceptanceDeadline,
        };
        await onJobUpdate(update);
        toast({
            title: "Offers Sent!",
            description: `Offers have been sent to ${selectedInstallers.length} installer(s). The first one to accept gets the job.`,
        });
        setIsSendingOffers(false);
    };

    const sortedBids = React.useMemo(() => {
        if (!job.bids) return [];
        return [...job.bids].sort((a,b) => b.amount - a.amount);
    }, [job.bids]);

    const isJobAwarded = !!job.awardedInstaller;

    const AnalyzeButton = () => {
        if (!isSubscribed) {
            return (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="outline" onClick={() => router.push('/dashboard/billing')}>
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
                                <h3 className="font-semibold flex items-center gap-2"><Trophy className="h-5 w-5 text-primary"/> Top Recommendation: {analysisResult.topRecommendation.anonymousId}</h3>
                                <p className="text-sm text-muted-foreground mt-1">{analysisResult.topRecommendation.reasoning}</p>
                            </div>
                             <div className="p-4 rounded-lg border border-green-500/50 bg-green-500/5">
                                <h3 className="font-semibold flex items-center gap-2"><Lightbulb className="h-5 w-5 text-green-600"/> Best Value: {analysisResult.bestValue.anonymousId}</h3>
                                <p className="text-sm text-muted-foreground mt-1">{analysisResult.bestValue.reasoning}</p>
                            </div>
                            {analysisResult.redFlags.length > 0 && (
                                <div className="p-4 rounded-lg border border-destructive/50 bg-destructive/5">
                                    <h3 className="font-semibold flex items-center gap-2"><AlertOctagon className="h-5 w-5 text-destructive"/> Potential Red Flags</h3>
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
                <CardTitle>Received Bids ({job.bids?.length || 0})</CardTitle>
                <CardDescription>
                  {isJobAwarded ? 'An installer has been selected for this job.' : 
                  'Select up to 3 installers to send offers to. The first to accept wins the job.'}
                </CardDescription>
            </div>
            <div className="flex gap-2">
                 {job.bids && job.bids.length > 1 && !isJobAwarded && (
                     <AnalyzeButton />
                 )}
                {!isJobAwarded && (
                    <Button onClick={handleSendOffers} disabled={isSendingOffers || selectedInstallers.length === 0}>
                        {isSendingOffers && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Send Offers to Selected ({selectedInstallers.length})
                    </Button>
                )}
            </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {sortedBids.map((bid) => (
          <JobGiverBid 
            key={(bid.installer as User).id}
            bid={bid} 
            job={job} 
            anonymousId={anonymousIdMap.get((bid.installer as User).id) || `Bidder-?`}
            selected={selectedInstallers.includes((bid.installer as User).id)}
            onSelect={handleSelectInstaller}
            isDisabled={isJobAwarded || selectedInstallers.length >= 3}
          />
        ))}
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
                proposedBy: user.roles.includes('Job Giver') ? 'Job Giver' : 'Installer',
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

    const handleApproveQuote = (taskId: string) => {
        // In a real implementation, this would trigger a payment flow.
        // For now, we'll just update the status.
        toast({
            title: "Quote Approved (Simulation)",
            description: "In a real app, you would now be redirected to payment.",
        });
        
        const updatedTasks = (job.additionalTasks || []).map(task => 
            task.id === taskId ? { ...task, status: 'approved' as const } : task
        );
        onJobUpdate({ additionalTasks: updatedTasks });
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
                             <Textarea id="task-desc" value={newTaskDescription} onChange={(e) => setNewTaskDescription(e.target.value)} placeholder="e.g., Install one more camera in the back office."/>
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

export default function JobDetailPage() {
  const { user, role } = useUser();
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
  const [isFunded, setIsFunded] = React.useState(false);

  const [newComment, setNewComment] = React.useState("");

  const [newPrivateMessage, setNewPrivateMessage] = React.useState("");
  const [privateMessageAttachments, setPrivateMessageAttachments] = React.useState<File[]>([]);
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
    
    const jobRef = doc(db, 'jobs', id);
    const jobSnap = await getDoc(jobRef);

    if (!jobSnap.exists()) {
        setJob(null);
        setLoading(false);
        return;
    }

    let jobData = jobSnap.data() as Job;

    // --- Automatic decline logic for EXPIRED job offers ---
    if (jobData.status === 'Awarded' && jobData.acceptanceDeadline && toDate(jobData.acceptanceDeadline) < new Date()) {
        const deadline = toDate(jobData.deadline);
        const now = new Date();
        const newStatus = now > deadline ? 'Bidding Closed' : 'Open for Bidding';

        // Disqualify all installers who were selected but didn't accept
        const expiredInstallerIds = (jobData.selectedInstallers || []).map(s => s.installerId);

        const update: Partial<Job> = { 
            status: newStatus, 
            awardedInstaller: undefined, 
            acceptanceDeadline: undefined,
            selectedInstallers: [], // Clear the selection
            disqualifiedInstallerIds: arrayUnion(...expiredInstallerIds) as any,
        };
        
        await updateDoc(jobRef, update);
        jobData = { ...jobData, ...update }; // Update local copy
        toast({ title: "Offer Expired", description: "The selected installer(s) did not accept the offer in time. You can now award the job to someone else." });
    }

    // Collect all unique user IDs from the job document
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
    
    // Fetch all users in one go
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

    // Populate the job object with the fetched user data
    const populatedJob: Job = {
        ...jobData,
        jobGiver: usersMap.get(jobGiverId!) || jobData.jobGiver,
        awardedInstaller: awardedInstallerId ? (usersMap.get(awardedInstallerId) || jobData.awardedInstaller) : undefined,
        bids: (jobData.bids || []).map(bid => ({ ...bid, installer: usersMap.get(getRefId(bid.installer)!)! })),
        comments: (jobData.comments || []).map(comment => ({ ...comment, author: usersMap.get(getRefId(comment.author)!)! })),
        privateMessages: (jobData.privateMessages || []).map(msg => ({...msg, author: usersMap.get(getRefId(msg.author)!)!})),
    };
    
    setJob(populatedJob);
    setLoading(false);
  }, [id, db, toast]);

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
                variant: "success",
            });
            // Re-fetch job data to show the updated "In Progress" status
            fetchJob();
        } else if (paymentStatus === 'failure') {
            toast({
                title: "Payment Failed",
                description: "The payment could not be completed. Please try again.",
                variant: "destructive",
            });
        }
        // Clean the URL
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
    }
  }, [job]);

  const handleJobUpdate = React.useCallback(async (updatedPart: Partial<Job>) => {
    if (job) {
      const jobRef = doc(db, 'jobs', job.id);
      await updateDoc(jobRef, updatedPart);
      // Re-fetch the job to get the latest populated data
      fetchJob();
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
    
    await handleJobUpdate({ comments: arrayUnion(newCommentObject) });

    setNewComment("");
     toast({
      title: "Comment Posted!",
    });
  };

  const handlePostPrivateMessage = async () => {
    if ((!newPrivateMessage.trim() && privateMessageAttachments.length === 0) || !user || !job || !storage) return;

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

    const uploadPromises = privateMessageAttachments.map(async file => {
        const fileRef = ref(storage, `jobs/${job.id}/private_messages/${Date.now()}_${file.name}`);
        await uploadBytes(fileRef, file);
        const fileUrl = await getDownloadURL(fileRef);
        return { fileName: file.name, fileUrl, fileType: file.type };
    });

    const uploadedAttachments = await Promise.all(uploadedAttachments);

    const newMessageObject: PrivateMessage = {
      id: `MSG-${Date.now()}`,
      author: doc(db, 'users', user.id),
      timestamp: new Date(),
      content: newPrivateMessage,
      attachments: uploadedAttachments,
    };
    
    await handleJobUpdate({ 
        privateMessages: arrayUnion(newMessageObject),
    });

    setNewPrivateMessage("");
    setPrivateMessageAttachments([]);
    setIsSendingMessage(false);
     toast({
      title: "Message Sent!",
    });
  };

  const handleCancelJob = async () => {
      await handleJobUpdate({ status: 'Cancelled' });
      toast({
          title: "Job Cancelled",
          description: "This job has been cancelled and is no longer active.",
          variant: "destructive"
      });
  }
  
  const handleFundJob = async () => {
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
                     await handleJobUpdate({ status: 'In Progress' });
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
        // Create a reference to the file to delete
        const fileRef = ref(storage, attachmentToDelete.fileUrl);
        
        // Delete the file
        await deleteObject(fileRef);

        // Remove the attachment from the job's attachments array in Firestore
        await handleJobUpdate({
            attachments: arrayRemove(attachmentToDelete) as any
        });

        toast({
            title: "Attachment Deleted",
            description: `Successfully deleted ${attachmentToDelete.fileName}.`,
            variant: "success",
        });
      } catch (error: any) {
          console.error("Error deleting attachment:", error);
          if (error.code === 'storage/object-not-found') {
               // If file doesn't exist in storage, just remove it from firestore
                await handleJobUpdate({
                    attachments: arrayRemove(attachmentToDelete) as any
                });
                toast({ title: "Attachment Removed", description: "The attachment reference was removed, though the file was not found in storage.", variant: "warning" });
          } else {
             toast({
                title: "Error Deleting Attachment",
                description: "An unexpected error occurred. Please try again.",
                variant: "destructive",
            });
          }
      }
    };

  const handleReportAbandonment = async () => {
    if (!user || !job || !job.awardedInstaller) return;
    
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
        reason: "The job has been funded, but the awarded installer has become unresponsive. I am reporting this to request mediation.",
        parties: {
            jobGiverId: jobGiver.id,
            installerId: awardedInstaller.id,
        },
        messages: [{
            authorId: user.id,
            authorRole: "Job Giver",
            content: "The job has been funded, but the awarded installer has become unresponsive. I am reporting this to request mediation.",
            timestamp: new Date()
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
    notFound();
  }

  const awardedInstallerId = getRefId(job.awardedInstaller);
  const isSelectedInstaller = role === "Installer" && (job.selectedInstallers || []).some(s => s.installerId === user.id);
  const isAwardedInstaller = role === "Installer" && user.id === awardedInstallerId;
  const jobGiver = job.jobGiver as User;
  const isJobGiver = role === "Job Giver" && user.id === jobGiver.id;
  
  const canEditJob = isJobGiver && job.status === 'Open for Bidding';
  const canCancelJob = isJobGiver && (job.status === 'In Progress' || job.status === 'Open for Bidding' || job.status === 'Bidding Closed');
  const canReportAbandonment = isJobGiver && job.status === 'In Progress' && isFunded;
  
  const identitiesRevealed = (job.status !== 'Open for Bidding' && job.status !== 'Bidding Closed' && job.status !== 'Awarded') || role === 'Admin';
  const showJobGiverRealIdentity = identitiesRevealed;
  
  const canPostPublicComment = job.status === 'Open for Bidding' && (role === 'Installer' || isJobGiver || role === 'Admin');
  const communicationMode: 'public' | 'private' | 'none' =
    (job.status === 'In Progress' || job.status === 'Completed' || job.status === 'Disputed') && (isJobGiver || isAwardedInstaller || role === 'Admin')
      ? 'private'
      : job.status === 'Open for Bidding'
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
                    <Badge variant={getStatusVariant(job.status)} className="mb-2">{job.status}</Badge>
                    <CardTitle className="text-2xl">{job.title}</CardTitle>
                    <CardDescription className="font-mono text-sm pt-1">{job.id}</CardDescription>
                </div>
                <div className="flex items-center gap-3">
                    <Avatar>
                        {showJobGiverRealIdentity ? <AvatarImage src={jobGiver.realAvatarUrl} /> : <AnimatedAvatar svg={jobGiver.avatarUrl} />}
                        <AvatarFallback>{jobGiver.name.substring(0, 2)}</AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="text-sm font-semibold">{showJobGiverRealIdentity ? jobGiver.name : 'Job Giver'}</p>
                        {showJobGiverRealIdentity && <p className="text-xs text-muted-foreground font-mono">{jobGiver.id}</p>}
                    </div>
                </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-foreground">{job.description}</p>
            
            {job.status === 'Pending Funding' && isJobGiver && (
                <>
                    <Separator className="my-6" />
                    <Card className="bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
                        <CardHeader>
                            <CardTitle>Action Required: Fund Project</CardTitle>
                            <CardDescription>The installer has accepted your offer. Please complete the payment to secure the service and start the work.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button onClick={handleFundJob} disabled={isFunding}>
                                {isFunding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                <Wallet className="mr-2 h-4 w-4" />
                                Proceed to Payment
                            </Button>
                        </CardContent>
                    </Card>
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
                      <div key={idx} className="flex items-center justify-between p-2 rounded-md bg-secondary/50">
                        <a 
                          href={file.fileUrl} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="flex items-center gap-2 text-primary hover:underline"
                        >
                          <FileIcon className="h-4 w-4" />
                          <span className="text-sm">{file.fileName}</span>
                        </a>
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
                                    <AlertDialogAction onClick={() => handleAttachmentDelete(file)} className={cn(buttonVariants({variant: "destructive"}))}>
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
                                    authorName = (job.awardedInstaller as User)?.name;
                                    authorAvatar = (job.awardedInstaller as User)?.realAvatarUrl;
                                }

                                return <CommentDisplay key={comment.id || authorId + comment.timestamp} comment={comment} authorName={authorName} authorAvatar={authorAvatar}/>;
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
                                    <AvatarFallback>{author.name.substring(0,2)}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                    <div className="flex justify-between items-center">
                                        <p className="font-semibold text-sm">{author.name}</p>
                                        <p className="text-xs text-muted-foreground">{timeAgo}</p>
                                    </div>
                                    <div className="text-sm mt-1 text-foreground bg-accent/30 p-3 rounded-lg space-y-3">
                                       {message.content && <p>{message.content}</p>}
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
                                 <FileUpload onFilesChange={setPrivateMessageAttachments} maxFiles={3} />
                                <Button size="sm" onClick={handlePostPrivateMessage} disabled={isSendingMessage || (!newPrivateMessage.trim() && privateMessageAttachments.length === 0)}>
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
                        
                        return <CommentDisplay key={comment.id || authorId + comment.timestamp} comment={comment} authorName={authorName} authorAvatar={authorAvatar}/>;
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
                <InstallerCompletionSection job={job} user={user} onJobUpdate={handleJobUpdate} />
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

        {role === "Installer" && job.status === "Open for Bidding" && <InstallerBidSection job={job} user={user} onJobUpdate={handleJobUpdate} />}
        {(role === "Job Giver" || role === "Admin") && job.bids.length > 0 && job.status !== "Awarded" && job.status !== "In Progress" && job.status !== "Completed" && job.status !== "Pending Funding" && <BidsSection job={job} onJobUpdate={handleJobUpdate} anonymousIdMap={anonymousIdMap} />}
        
        {job.status === 'In Progress' && (isJobGiver || isAwardedInstaller) && (
            <AdditionalTasksSection job={job} user={user} onJobUpdate={handleJobUpdate} />
        )}

      </div>

      <div className="space-y-8">
        {(isJobGiver && (job.status === 'In Progress' || job.status === 'Awarded' || job.status === 'Pending Funding')) && (
            <JobGiverOTPCard job={job} />
        )}
        <Card>
          <CardHeader>
            <CardTitle>Job Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-foreground">
            <div className="flex items-center gap-3">
              <IndianRupee className="h-5 w-5" />
              <div>
                <p className="text-muted-foreground">Budget</p>
                <p className="font-semibold">
                  {job.budget ? `₹${job.budget.min.toLocaleString()} - ₹${job.budget.max.toLocaleString()}` : 'Not specified'}
                   {job.travelTip && job.travelTip > 0 && (
                    <span className="text-primary font-semibold">(+ ₹{job.travelTip.toLocaleString()} tip)</span>
                  )}
                </p>
              </div>
            </div>
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
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" className="w-full">
                            <AlertOctagon className="mr-2 h-4 w-4" />
                            Report: Installer Not Responding
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Report Installer Not Responding?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will immediately pause the project and create a dispute ticket for admin review. Use this if the installer is unresponsive after you have funded the job.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleReportAbandonment} className={cn(buttonVariants({variant: "destructive"}))}>Confirm & Create Dispute</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
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
                                <AlertDialogAction onClick={handleCancelJob} className={cn(buttonVariants({variant: "destructive"}))}>Confirm Cancellation</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                )}
              </div>
          </CardContent>
        </Card>
        
      </div>
    </div>
  );
}
