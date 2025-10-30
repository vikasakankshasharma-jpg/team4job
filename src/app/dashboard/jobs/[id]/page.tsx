
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
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import React from "react";
import { aiAssistedBidCreation } from "@/ai/flows/ai-assisted-bid-creation";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Bid, Job, Comment, User, JobAttachment, PrivateMessage, Dispute, Transaction, Invoice, PlatformSettings } from "@/lib/types";
import { AnimatedAvatar } from "@/components/ui/animated-avatar";
import { getStatusVariant, toDate, cn, validateMessageContent } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { doc, getDoc, updateDoc, arrayUnion, setDoc, DocumentReference, collection, getDocs, query, where, arrayRemove } from "firebase/firestore";
import axios from 'axios';
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { FileUpload } from "@/components/ui/file-upload";
import { Checkbox } from "@/components/ui/checkbox";


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

        // --- 3. Call backend to release the escrow ---
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
            rating: 5, // Default to 5-star rating, user can change later
            attachments: arrayUnion(...uploadedAttachments) as any, // Add completion proof to job attachments
            ...(invoiceData && { invoice: invoiceData }),
        };
        onJobUpdate(updatedJobData);
        
        toast({
          title: "Job Completed!",
          description: "Payout has been initiated and invoice has been generated. You will receive a notification once it's processed.",
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
                            </div>
                            <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
                                <span className="flex items-center gap-1"><Trophy className="h-3 w-3 text-amber-500" /> {installer.installerProfile?.tier} Tier</span>
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
    const { toast } = useToast();
    const [selectedInstallers, setSelectedInstallers] = React.useState<string[]>([]);
    const [isSendingOffers, setIsSendingOffers] = React.useState(false);

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
            {!isJobAwarded && (
                <Button onClick={handleSendOffers} disabled={isSendingOffers || selectedInstallers.length === 0}>
                    {isSendingOffers && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Send Offers to Selected ({selectedInstallers.length})
                </Button>
            )}
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
    const { user } = useUser();
    const { toast } = useToast();
    const { db } = useFirebase();
    const [timeLeft, setTimeLeft] = React.useState('');
    const [isActionLoading, setIsActionLoading] = React.useState(false);

    React.useEffect(() => {
        if (!job.acceptanceDeadline) return;

        const interval = setInterval(() => {
            const now = new Date();
            const deadline = toDate(job.acceptanceDeadline!);
            const diff = deadline.getTime() - now.getTime();

            if (diff <= 0) {
                setTimeLeft('Expired');
                clearInterval(interval);
            } else {
                const hours = Math.floor(diff / (1000 * 60 * 60));
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((diff % (1000 * 60)) / 1000);
                setTimeLeft(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [job.acceptanceDeadline]);

    const handleAccept = async () => {
        setIsActionLoading(true);
        // "First to confirm" logic: check if someone else accepted it first
        const jobRef = doc(db, 'jobs', job.id);
        const jobSnap = await getDoc(jobRef);
        const latestJobData = jobSnap.data() as Job;

        if (latestJobData.status !== 'Awarded') {
             toast({ title: 'Job No Longer Available', description: 'Another installer has already accepted this job.', variant: 'destructive' });
             setIsActionLoading(false);
             onJobUpdate(latestJobData); // Refresh the UI with the latest data
             return;
        }

        const update: Partial<Job> = { 
            status: 'Pending Funding',
            awardedInstaller: doc(db, 'users', user!.id)
        };
        await onJobUpdate(update);
        toast({ title: 'Job Accepted!', description: 'The Job Giver has been notified to fund the project.', variant: "success" });
        setIsActionLoading(false);
    };
    
    const handleDecline = async () => {
        if (!user || !db) return;
        setIsActionLoading(true);
        
        const settingsDoc = await getDoc(doc(db, "settings", "platform"));
        const penalty = settingsDoc.data()?.penaltyForDeclinedJob || 0;
        
        const newSelectedInstallers = (job.selectedInstallers || []).filter(s => s.installerId !== user.id);
        const update: Partial<Job> = { 
            disqualifiedInstallerIds: arrayUnion(user.id) as any,
            selectedInstallers: newSelectedInstallers
        };

        if (newSelectedInstallers.length === 0) {
            const deadline = toDate(job.deadline);
            const now = new Date();
            update.status = now > deadline ? 'Bidding Closed' : 'Open for Bidding';
            update.awardedInstaller = undefined;
            update.acceptanceDeadline = undefined;
        }

        const userRef = doc(db, 'users', user.id);
        const userDoc = await getDoc(userRef);
        const currentPoints = userDoc.data()?.installerProfile?.points || 0;

        await updateDoc(userRef, { 'installerProfile.points': currentPoints + penalty });
        await onJobUpdate(update);
        
        toast({ title: 'Offer Declined', description: `You have declined the offer for this job. ${penalty} points have been deducted.`, variant: 'destructive' });
        setIsActionLoading(false);
    };


    return (
        <Card>
            <CardHeader>
                <CardTitle>You've Received an Offer!</CardTitle>
                <CardDescription>
                    The Job Giver has shortlisted you for this job. Accept the offer to secure the project. The first installer to accept wins.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-center">
                 <div className="flex items-center justify-center gap-2 text-lg font-semibold text-amber-600">
                    <Hourglass className="h-5 w-5" />
                    Time to accept: {timeLeft}
                </div>
                 <p className="text-xs text-muted-foreground">
                    If you do not accept within the time limit, the offer will expire and may affect your reputation score.
                </p>
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="destructive" disabled={isActionLoading}>
                            {isActionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ThumbsDown className="mr-2 h-4 w-4" />}
                            Decline
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Are you sure you want to decline?</DialogTitle>
                            <DialogDescription>
                                Declining this offer will result in a reputation penalty. This action cannot be undone.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                            <DialogClose asChild><Button variant="destructive" onClick={handleDecline}>Confirm Decline</Button></DialogClose>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
                <Button onClick={handleAccept} disabled={isActionLoading}>
                    {isActionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Accept Job
                </Button>
            </CardFooter>
        </Card>
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
                    <Button variant="destructive" onClick={handleDecline}>Decline</Button>
                    <Button onClick={handleAccept}>Accept</Button>
                </CardFooter>
            )}
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
  const [transaction, setTransaction] = React.useState<Transaction | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [platformSettings, setPlatformSettings] = React.useState<PlatformSettings | null>(null);
  const [isFunding, setIsFunding] = React.useState(false);
  const [isFunded, setIsFunded] = React.useState(false);

  const [newComment, setNewComment] = React.useState("");

  const [newPrivateMessage, setNewPrivateMessage] = React.useState("");
  const [privateMessageAttachments, setPrivateMessageAttachments] = React.useState<File[]>([]);
  
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
  
  const canRaiseDispute = (isJobGiver || isAwardedInstaller) && (job.status === 'In Progress' || job.status === 'Completed');
  const canCancelJob = isJobGiver && (job.status === 'In Progress' || job.status === 'Open for Bidding' || job.status === 'Bidding Closed');
  
  const identitiesRevealed = (job.status !== 'Open for Bidding' && job.status !== 'Bidding Closed' && job.status !== 'Awarded') || role === 'Admin';
  const showJobGiverRealIdentity = identitiesRevealed;
  
  const canPostPublicComment = job.status === 'Open for Bidding' && (role === 'Installer' || isJobGiver || role === 'Admin');
  const communicationMode: 'public' | 'private' | 'none' =
    (job.status === 'In Progress' || job.status === 'Completed') && (isJobGiver || isAwardedInstaller || role === 'Admin')
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
                            <CardDescription>The installer has accepted your offer. Please complete the payment to secure the service and begin the work.</CardDescription>
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
                  <FinancialsCard job={job} transaction={transaction} platformSettings={platformSettings} user={user} />
              </>
            )}
          </CardContent>
        </Card>

        {role === "Installer" && job.status === "Open for Bidding" && <InstallerBidSection job={job} user={user} onJobUpdate={handleJobUpdate} />}
        {(role === "Job Giver" || role === "Admin") && job.bids.length > 0 && job.status !== "Awarded" && job.status !== "In Progress" && job.status !== "Completed" && job.status !== "Pending Funding" && <BidsSection job={job} onJobUpdate={handleJobUpdate} anonymousIdMap={anonymousIdMap} />}

      </div>

      <div className="space-y-8">
        {(role === 'Job Giver' && (job.status === 'In Progress' || job.status === 'Awarded' || job.status === 'Pending Funding')) && (
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
                    <span className="text-primary font-semibold"> (+ ₹{job.travelTip.toLocaleString()} tip)</span>
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
                <p className="text-muted-foreground">Public Comments</p>
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
                {job.status === 'Completed' && job.invoice && (
                    <Button asChild className="w-full">
                        <Link href={`/dashboard/jobs/${job.id}/invoice`}>
                            <FileText className="mr-2 h-4 w-4" />
                            View Invoice
                        </Link>
                    </Button>
                )}
                {canRaiseDispute && !job.disputeId && (
                     <RaiseDisputeDialog 
                        job={job} 
                        user={user} 
                        onJobUpdate={handleJobUpdate}
                      />
                )}
                 {job.disputeId && (
                   <Button asChild className="w-full">
                       <Link href={`/dashboard/disputes/${job.disputeId}`}>
                          <AlertOctagon className="mr-2 h-4 w-4" />
                          View Dispute
                       </Link>
                   </Button>
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
                                    {job.status === 'In Progress' && isFunded && " This will terminate the contract with the current installer. You must contact support to process a refund of the escrowed funds."}
                                    {job.status === 'In Progress' && !isFunded && " This will terminate the contract with the current installer."}
                                    {job.status !== 'In Progress' && " The job will be marked as 'Cancelled' and will no longer be open for bidding."}
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Back</AlertDialogCancel>
                                <AlertDialogAction onClick={handleCancelJob} className={cn(buttonVariants({variant: "destructive"}))}>Confirm Cancellation</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
              </div>
          </CardContent>
        </Card>
        
      </div>
    </div>
  );
}
