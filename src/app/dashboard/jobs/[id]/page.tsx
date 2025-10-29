

"use client";

import { useUser, useFirebase } from "@/hooks/use-user";
import { notFound, useParams, useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import React from "react";
import { aiAssistedBidCreation } from "@/ai/flows/ai-assisted-bid-creation";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Bid, Job, Comment, User, JobAttachment, PrivateMessage, Dispute, Transaction } from "@/lib/types";
import { AnimatedAvatar } from "@/components/ui/animated-avatar";
import { getStatusVariant, toDate, cn, validateMessageContent } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { doc, getDoc, updateDoc, arrayUnion, setDoc, DocumentReference, collection, getDocs, query, where, arrayRemove } from "firebase/firestore";
import axios from 'axios';
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { FileUpload } from "@/components/ui/file-upload";


declare const cashfree: any;

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
            description: "Please set up your bank account in your profile before completing a job.",
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

        // --- 3. Call backend to release the escrow ---
        await axios.post('/api/escrow/release-funds', {
            transactionId: transactionDoc.id,
        });
        
        // --- 4. Update Job Status locally and in Firestore ---
        const updatedJobData: Partial<Job> = { 
            status: 'Completed', 
            rating: 5, // Default to 5-star rating, user can change later
            attachments: arrayUnion(...uploadedAttachments) as any // Add completion proof to job attachments
        };
        onJobUpdate(updatedJobData);
        
        toast({
          title: "Job Completed!",
          description: "Payout has been initiated. You will receive a notification once it's processed.",
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
          Once you are satisfied with the completed work, share this code with the installer. They will use it to mark the job as complete and trigger the payout.
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

  const installer = user.installerProfile;
  if (!installer) return null;
  
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Place Your Bid</CardTitle>
        <CardDescription>
          Submit your best offer for this project.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <Input 
            type="number" 
            placeholder="Your bid amount (₹)" 
            className="flex-1" 
            value={bidAmount}
            onChange={(e) => setBidAmount(e.target.value)}
          />
          <Button onClick={handlePlaceBid}>Place Bid</Button>
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

function JobGiverBid({ bid, job, onJobUpdate, anonymousId }: { bid: Bid, job: Job, onJobUpdate: (updatedJob: Partial<Job>) => void, anonymousId: string }) {
    const { user: jobGiver, role } = useUser();
    const { toast } = useToast();
    const { db } = useFirebase();
    const [timeAgo, setTimeAgo] = React.useState('');
    const [isFunding, setIsFunding] = React.useState(false);
    const installer = bid.installer as User;

    const awardedInstallerId = (job.awardedInstaller instanceof DocumentReference) 
        ? job.awardedInstaller.id 
        : (job.awardedInstaller as User)?.id;

    const isAwardedToThisBidder = awardedInstallerId === installer.id;
    const isJobAwarded = !!job.awardedInstaller;

    React.useEffect(() => {
        if(bid.timestamp) {
            setTimeAgo(formatDistanceToNow(toDate(bid.timestamp), { addSuffix: true }));
        }
    }, [bid.timestamp]);

    const handleAwardJob = async () => {
        if (!db || !jobGiver) return;
        setIsFunding(true);
        
        try {
            // Step 1: Call backend to create a payment session ID
            const { data } = await axios.post('/api/escrow/initiate-payment', {
                jobId: job.id,
                jobTitle: job.title,
                jobGiverId: jobGiver.id,
                installerId: installer.id,
                amount: bid.amount,
            });

            if (!data.payment_session_id) {
                throw new Error("Could not retrieve payment session ID.");
            }

            // Step 2: Launch Cashfree checkout
            const cashfreeInstance = new cashfree(data.payment_session_id);
            cashfreeInstance.checkout({
                payment_method: "upi",
            });
            // The onComplete/onError logic is handled by the redirect URL now

        } catch (error: any) {
             toast({
                title: "Failed to Initiate Payment",
                description: error.response?.data?.error || "An unexpected error occurred. Please try again.",
                variant: "destructive"
            });
             setIsFunding(false);
        }
    };
    
    const isAdmin = role === 'Admin';
    const isJobGiver = role === 'Job Giver';
    // Identities are revealed once the installer accepts the job.
    const identitiesRevealed = job.status !== 'Open for Bidding' && job.status !== 'Bidding Closed' && job.status !== 'Awarded' || role === 'Admin';

    const installerName = identitiesRevealed ? installer.name : anonymousId;
    const avatar = identitiesRevealed ? <AvatarImage src={installer.realAvatarUrl} alt={installer.name} /> : <AnimatedAvatar svg={installer.avatarUrl} />;
    const avatarFallback = identitiesRevealed ? installer.name.substring(0, 2) : anonymousId.split('-')[1];

    return (
        <div className={cn("p-4 rounded-lg border", isAwardedToThisBidder && 'border-primary bg-primary/5')}>
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
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Star className="h-3 w-3 fill-primary text-primary" />
                            <span>{installer.installerProfile?.rating} ({installer.installerProfile?.reviews} reviews)</span>
                            {installer.installerProfile?.verified && <ShieldCheck className="h-3 w-3 text-green-600" />}
                        </div>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-lg font-bold">₹{bid.amount.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{timeAgo}</p>
                </div>
            </div>
            <p className="mt-4 text-sm text-foreground">{bid.coverLetter}</p>
            {isJobGiver && !isJobAwarded && (
              <div className="mt-4 flex items-center gap-2">
                   <Button size="sm" onClick={handleAwardJob} disabled={isFunding}>
                        {isFunding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <Award className="mr-2 h-4 w-4" />
                       Award & Fund Job
                   </Button>
              </div>
            )}
        </div>
    );
}

function BidsSection({ job, onJobUpdate, anonymousIdMap }: { job: Job, onJobUpdate: (updatedJob: Partial<Job>) => void, anonymousIdMap: Map<string, string> }) {
    const { role } = useUser();
    
    const calculateBidScore = (bid: Bid, job: Job) => {
        const profile = (bid.installer as User).installerProfile;
        if (!profile) return -Infinity;
        const priceRange = job.budget.max - job.budget.min;
        const priceScore = priceRange > 0 ? (job.budget.max - bid.amount) / priceRange : 1;
        const ratingScore = profile.rating / 5;
        const reputationScore = Math.log1p(profile.points) / Math.log1p(3000);
        const W_PRICE = 0.5;
        const W_RATING = 0.3;
        const W_REPUTATION = 0.2;
        return (priceScore * W_PRICE) + (ratingScore * W_RATING) + (reputationScore * W_REPUTATION);
    }

    const sortedBids = React.useMemo(() => {
        if (!job.bids) return [];
        return [...job.bids]
            .map(bid => ({ bid, score: calculateBidScore(bid, job) }))
            .sort((a, b) => b.score - a.score);
    }, [job.bids, job.budget]);


  return (
    <Card id="bids-section">
      <CardHeader>
        <CardTitle>Received Bids ({job.bids?.length || 0})</CardTitle>
        <CardDescription>
          {role === 'Admin' ? 'Reviewing bids placed on this job.' : job.awardedInstaller ? 'An installer has been selected for this job.' : 
          'Review bids and select an installer for the project.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {sortedBids.map(({ bid }) => (
          <JobGiverBid 
            key={(bid.installer as User).id}
            bid={bid} 
            job={job} 
            onJobUpdate={onJobUpdate}
            anonymousId={anonymousIdMap.get((bid.installer as User).id) || `Bidder-?`}
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

function ReputationImpactCard({ job }: { job: Job }) {
  if (job.status !== 'Completed' || !job.awardedInstaller || !job.rating) {
    return null;
  }
  
  const awardedInstallerId = (job.awardedInstaller instanceof DocumentReference) ? job.awardedInstaller.id : (job.awardedInstaller as User)?.id;
  const winningBid = (job.bids || []).find(b => (((b.installer instanceof DocumentReference) ? b.installer.id : (b.installer as User)?.id)) === awardedInstallerId);
  const installer = winningBid?.installer as User;

  if (!installer) return null;

  const ratingPoints = job.rating === 5 ? 20 : job.rating === 4 ? 10 : 0;
  const completionPoints = 50;
  const totalPoints = completionPoints + ratingPoints;

  return (
    <Card className="bg-gradient-to-br from-blue-50/20 to-purple-50/20 dark:from-blue-950/20 dark:to-purple-950/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
            <Award className="h-5 w-5 text-primary" />
            Reputation Impact
        </CardTitle>
        <CardDescription>Reputation points awarded to Installer #{awardedInstallerId.slice(-4)} for this job.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between items-center text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="h-4 w-4" />
                <span>Job Completion</span>
            </div>
            <span className="font-medium text-green-600">+ {completionPoints} pts</span>
        </div>
         <div className="flex justify-between items-center text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
                <Star className="h-4 w-4" />
                <span>{job.rating}-Star Rating from Job Giver</span>
            </div>
            <span className="font-medium text-green-600">+ {ratingPoints} pts</span>
        </div>
        <Separator />
         <div className="flex justify-between items-center font-semibold">
            <div className="flex items-center gap-2">
                 <TrendingUp className="h-4 w-4" />
                <span>Total Points Earned</span>
            </div>
            <span className="text-green-600">+ {totalPoints} pts</span>
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

function EditDateDialog({ job, onJobUpdate, triggerElement }: { job: Job; onJobUpdate: (updatedPart: Partial<Job>) => void; triggerElement: React.ReactNode }) {
    const { toast } = useToast();
    const [newDate, setNewDate] = React.useState<string>(job.jobStartDate ? format(toDate(job.jobStartDate), "yyyy-MM-dd") : "");
    const [isOpen, setIsOpen] = React.useState(false);

    const handleSave = async () => {
        if (newDate) {
            onJobUpdate({ jobStartDate: new Date(newDate) });
            toast({
                title: "Date Updated",
                description: `Job start date has been changed to ${format(new Date(newDate), "MMM d, yyyy")}.`,
            });
            setIsOpen(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>{triggerElement}</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Change Job Start Date</DialogTitle>
                    <DialogDescription>
                        Select a new start date for this job. The installer will be notified.
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
                    <Button onClick={handleSave} disabled={!newDate}>Save Changes</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function RaiseDisputeDialog({ job, user, onJobUpdate }: { job: Job; user: User; onJobUpdate: (updatedPart: Partial<Job>) => void; }) {
    const { toast } = useToast();
    const { db } = useFirebase();
    const [reason, setReason] = React.useState("");
    const [isOpen, setIsOpen] = React.useState(false);
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const handleRaiseDispute = async () => {
        if (!reason.trim()) {
            toast({ title: "Reason is required", variant: "destructive" });
            return;
        }
        setIsSubmitting(true);
        
        const newDisputeId = `DISPUTE-${Date.now()}`;
        
        // Ensure awardedInstaller is not null and get its reference
        const awardedInstaller = job.awardedInstaller;
        if (!awardedInstaller) {
            toast({ title: "Error", description: "No installer has been awarded this job.", variant: "destructive"});
            setIsSubmitting(false);
            return;
        }

        const newDispute: Partial<Dispute> = {
            id: newDisputeId,
            requesterId: user.id,
            category: "Job Dispute",
            title: `Dispute for job: ${job.title.slice(0, 30)}...`,
            jobId: job.id,
            jobTitle: job.title,
            status: 'Open',
            reason: reason,
            parties: {
                jobGiverId: (job.jobGiver as User | DocumentReference).id,
                installerId: (awardedInstaller as User | DocumentReference).id,
            },
            messages: [{
                authorId: user.id,
                authorRole: user.roles.includes('Admin') ? 'Admin' : (user.roles.includes('Job Giver') ? 'Job Giver' : 'Installer'),
                content: `Initial complaint: ${reason}`,
                timestamp: new Date()
            }],
            createdAt: new Date(),
        };

        try {
            await setDoc(doc(db, "disputes", newDisputeId), newDispute);
            onJobUpdate({ disputeId: newDisputeId });

            toast({
                title: "Dispute Raised Successfully",
                description: "An admin will review your case shortly. You can view the dispute from this page.",
            });
            setIsOpen(false);
        } catch (error) {
            console.error("Error raising dispute:", error);
            toast({ title: "Error", description: "Failed to raise dispute.", variant: "destructive"});
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive" className="w-full">
                <AlertOctagon className="mr-2 h-4 w-4" />
                Raise a Dispute
              </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Raise a Dispute for "{job.title}"</DialogTitle>
                    <DialogDescription>
                        Explain the issue clearly. An admin will review the case. This action cannot be undone.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Textarea
                        placeholder="Clearly describe the problem, e.g., 'The work was not completed as agreed upon...' or 'Payment has not been released after completion...'",
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        rows={5}
                    />
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline" disabled={isSubmitting}>Cancel</Button>
                    </DialogClose>
                    <Button onClick={handleRaiseDispute} disabled={!reason.trim() || isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Submit Dispute
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function InstallerAcceptanceSection({ job, onJobUpdate }: { job: Job, onJobUpdate: (updatedJob: Partial<Job>) => void }) {
    const { toast } = useToast();
    const [timeLeft, setTimeLeft] = React.useState('');

    React.useEffect(() => {
        if (!job.acceptanceDeadline) return;

        const interval = setInterval(() => {
            const now = new Date();
            const deadline = toDate(job.acceptanceDeadline!);
            const diff = deadline.getTime() - now.getTime();

            if (diff <= 0) {
                setTimeLeft('Expired');
                // Here you would trigger the auto-cancellation logic
                return;
            }

            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);
            setTimeLeft(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
        }, 1000);

        return () => clearInterval(interval);
    }, [job.acceptanceDeadline]);

    const handleAccept = async () => {
        const update = { status: 'In Progress' as const };
        onJobUpdate(update);
        toast({ title: 'Job Accepted!', description: 'You can now start communicating with the Job Giver.' });
    };
    
    const handleDecline = async () => {
        const update = { status: 'Open for Bidding' as const, awardedInstaller: undefined, acceptanceDeadline: undefined };
        onJobUpdate(update);
        toast({ title: 'Job Declined', description: 'The job is now open for bidding again.', variant: 'destructive' });
    };


    return (
        <Card>
            <CardHeader>
                <CardTitle>Awaiting Your Acceptance</CardTitle>
                <CardDescription>
                    The Job Giver has awarded this job to you. You must accept it within the time limit to proceed.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-center">
                 <div className="flex items-center justify-center gap-2 text-lg font-semibold text-amber-600">
                    <Hourglass className="h-5 w-5" />
                    Time to accept: {timeLeft}
                </div>
                 <p className="text-xs text-muted-foreground">
                    If you do not accept within the time limit, the job will be automatically declined and it may affect your reputation score.
                </p>
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="destructive">
                            <ThumbsDown className="mr-2 h-4 w-4" />
                            Decline
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Are you sure you want to decline?</DialogTitle>
                            <DialogDescription>
                                Declining a job after being awarded will negatively impact your reputation score. This action cannot be undone.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                            <DialogClose asChild><Button variant="destructive" onClick={handleDecline}>Confirm Decline</Button></DialogClose>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
                <Button onClick={handleAccept}>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Accept Job
                </Button>
            </CardFooter>
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
  const id = params.id as string;
  const { toast } = useToast();
  
  const [job, setJob] = React.useState<Job | null>(null);
  const [loading, setLoading] = React.useState(true);

  const [newComment, setNewComment] = React.useState("");

  const [newPrivateMessage, setNewPrivateMessage] = React.useState("");
  const [privateMessageAttachments, setPrivateMessageAttachments] = React.useState<File[]>([]);
  
  const [deadlineRelative, setDeadlineRelative] = React.useState('');
  const [deadlineAbsolute, setDeadlineAbsolute] = React.useState('');

  const fetchJob = React.useCallback(async () => {
    if (!db || !id) return;
    setLoading(true);
    const jobRef = doc(db, 'jobs', id);
    const jobSnap = await getDoc(jobRef);

    if (!jobSnap.exists()) {
        setJob(null);
        setLoading(false);
        return;
    }

    const jobData = jobSnap.data() as Job;

    // Collect all unique user IDs from the job document
    const userIds = new Set<string>();
    const jobGiverId = getRefId(jobData.jobGiver);
    if (jobGiverId) userIds.add(jobGiverId);
    
    const awardedInstallerId = getRefId(jobData.awardedInstaller);
    if (awardedInstallerId) userIds.add(awardedInstallerId);

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
  }, [id, db]);

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
                description: "The job has been awarded and the installer has been notified.",
                variant: "success",
            });
            // Re-fetch job data to show the updated "Awarded" status
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
    
    const uploadPromises = privateMessageAttachments.map(async file => {
        const fileRef = ref(storage, `jobs/${job.id}/${file.name}`);
        await uploadBytes(fileRef, file);
        const fileUrl = await getDownloadURL(fileRef);
        return { fileName: file.name, fileUrl, fileType: file.type };
    });

    const uploadedAttachments = await Promise.all(uploadPromises);

    const newMessageObject: Omit<PrivateMessage, 'id'> = {
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
     toast({
      title: "Message Sent!",
    });
  };

  if (loading) {
    return <PageSkeleton />;
  }

  if (!job || !user || !storage) {
    notFound();
  }

  const awardedInstallerId = getRefId(job.awardedInstaller);
  const isAwardedInstaller = role === "Installer" && user.id === awardedInstallerId;
  const jobGiver = job.jobGiver as User;
  const isJobGiver = role === "Job Giver" && user.id === jobGiver.id;
  
  const canRaiseDispute = (isJobGiver || isAwardedInstaller) && (job.status === 'In Progress' || job.status === 'Completed');
  const canPostPublicComment = job.status === 'Open for Bidding' && (role === 'Installer' || role === 'Job Giver' || role === 'Admin');
  
  const identitiesRevealed = (job.status !== 'Open for Bidding' && job.status !== 'Bidding Closed' && job.status !== 'Awarded') || role === 'Admin';
  const showJobGiverRealIdentity = identitiesRevealed;
  const canUsePrivateMessages = identitiesRevealed && (isJobGiver || isAwardedInstaller || role === 'Admin');

  const showInstallerAcceptance = isAwardedInstaller && job.status === 'Awarded';


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
            
            {job.attachments && job.attachments.length > 0 && (
              <>
                <Separator className="my-6" />
                <div>
                  <h3 className="font-semibold mb-4">Attachments</h3>
                  <div className="space-y-2">
                    {job.attachments.map((file, idx) => (
                      <a 
                        key={idx} 
                        href={file.fileUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="flex items-center gap-2 text-primary hover:underline bg-primary/10 p-2 rounded-md text-sm"
                      >
                        <FileIcon className="h-4 w-4" />
                        <span>{file.fileName}</span>
                      </a>
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

            {canUsePrivateMessages && (
              <>
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
                                <Button size="sm" onClick={handlePostPrivateMessage} disabled={!newPrivateMessage.trim() && privateMessageAttachments.length === 0}>
                                  <Send className="mr-2 h-4 w-4" />
                                  Send
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
              </>
            )}

            {job.status === "Open for Bidding" && (
              <>
                <Separator className="my-6" />
                <h3 className="font-semibold mb-4">Public Comments ({job.comments?.length || 0})</h3>
                <div className="space-y-6">
                    {(job.comments || []).map((comment) => {
                        const author = comment.author as User;
                        const authorId = author.id;
                        let authorName = "Installer";
                        let authorAvatar = author.avatarUrl;

                        if (authorId === jobGiver.id) {
                            authorName = "Job Giver";
                            authorAvatar = jobGiver.avatarUrl;
                        } else {
                            authorName = anonymousIdMap.get(authorId) || `Bidder-?`;
                        }
                        
                        return <CommentDisplay key={comment.id} comment={comment} authorName={authorName} authorAvatar={authorAvatar}/>;
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
                  <ReputationImpactCard job={job} />
              </>
            )}
          </CardContent>
        </Card>

        {role === "Installer" && job.status === "Open for Bidding" && <InstallerBidSection job={job} user={user} onJobUpdate={handleJobUpdate} />}
        {(role === "Job Giver" || role === "Admin") && job.bids.length > 0 && <BidsSection job={job} onJobUpdate={handleJobUpdate} anonymousIdMap={anonymousIdMap} />}

      </div>

      <div className="space-y-8">
        {(role === 'Job Giver' && (job.status === 'In Progress' || job.status === 'Awarded')) && (
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
              <div>
                  <p className="text-muted-foreground">Work Starts</p>
                  <p className="font-semibold">{jobStartDate}</p>
              </div>
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
                <p className="text-muted-foreground">Public Comments</p>
                <p className="font-semibold">{job.comments?.length || 0}</p>
              </div>
            </div>
          </CardContent>
          {(canRaiseDispute || job.disputeId) && (
            <>
              <Separator />
              <CardContent className="pt-6">
                {job.disputeId ? (
                   <Button asChild className="w-full">
                       <Link href={`/dashboard/disputes/${job.disputeId}`}>
                          <AlertOctagon className="mr-2 h-4 w-4" />
                          View Dispute
                       </Link>
                   </Button>
                ) : (
                  <RaiseDisputeDialog 
                    job={job} 
                    user={user} 
                    onJobUpdate={handleJobUpdate}
                  />
                )}
              </CardContent>
            </>
          )}
        </Card>
        
      </div>
    </div>
  );
}

      