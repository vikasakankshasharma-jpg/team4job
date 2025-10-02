
"use client";

import { useUser } from "@/hooks/use-user";
import { notFound, useParams } from "next/navigation";
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
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import React from "react";
import { aiAssistedBidCreation } from "@/ai/flows/ai-assisted-bid-creation";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Bid, Job, Comment, User, JobAttachment, PrivateMessage } from "@/lib/types";
import { AnimatedAvatar } from "@/components/ui/animated-avatar";
import { getStatusVariant, toDate } from "@/lib/utils";
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
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, DocumentReference, addDoc, collection, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase/client-config";


function InstallerCompletionSection({ job, onJobUpdate }: { job: Job, onJobUpdate: (updatedJob: Partial<Job>) => void }) {
  const { toast } = useToast();
  const [otp, setOtp] = React.useState('');

  const handleCompleteJob = async () => {
    if (otp === job.completionOtp) {
      const updatedData = { 
        status: 'Completed' as const,
        rating: 5, // Default rating, can be changed by job giver
      };
      
      const jobRef = doc(db, "jobs", job.id);
      await updateDoc(jobRef, updatedData);

      onJobUpdate(updatedData);
      
      toast({
        title: "Job Completed!",
        description: "Congratulations! The job has been marked as complete.",
      });
    } else {
      toast({
        title: "Invalid OTP",
        description: "The Job Completion OTP is incorrect. Please ask the Job Giver for the correct code.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Complete This Job</CardTitle>
        <CardDescription>
          Once the job is finished to the client's satisfaction, enter the
          Job Completion OTP provided by the Job Giver to mark it as complete. You can post photos or videos of the completed work as proof in the private messages section below.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <Input
            type="text"
            placeholder="Enter 6-digit OTP"
            className="flex-1"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            maxLength={6}
          />
          <Button onClick={handleCompleteJob} disabled={otp.length !== 6}>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Complete Job
          </Button>
        </div>
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
          Once you are satisfied with the completed work, share this code with the installer. They will use it to mark the job as complete.
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
    const newBid: Omit<Bid, 'id' | 'installer'> & { installer: DocumentReference } = {
      amount: Number(bidAmount),
      timestamp: new Date(),
      coverLetter: bidProposal,
      installer: doc(db, 'users', user.id)
    };
    
    const jobRef = doc(db, "jobs", job.id);
    
    const batch = writeBatch(db);
    batch.update(jobRef, {
        bids: arrayUnion(newBid),
        bidderIds: arrayUnion(user.id)
    });
    await batch.commit();

    const fullNewBid: Bid = {
        ...newBid,
        id: `bid-${job.id}-${user.id}`, // Mock id
        installer: user, // Add full user object for UI update
    };

    onJobUpdate({ 
        bids: [...(job.bids || []), fullNewBid],
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

function JobGiverBid({ bid, job, onSelectInstaller, onAwardJob, rank, isSelected, showRanking, canAward }: { bid: Bid, job: Job, onSelectInstaller: (installerId: string) => void, onAwardJob: (installerId: string) => void, rank: number, isSelected: boolean, showRanking: boolean, canAward: boolean }) {
    const { role } = useUser();
    const [timeAgo, setTimeAgo] = React.useState('');
    const installer = bid.installer as User;
    const awardedInstallerId = (job.awardedInstaller as DocumentReference)?.id || (job.awardedInstaller as User)?.id;
    const isAwardedToThisBidder = awardedInstallerId === installer.id;
    const isJobAwarded = !!job.awardedInstaller;

    React.useEffect(() => {
        if(bid.timestamp) {
            setTimeAgo(formatDistanceToNow(toDate(bid.timestamp), { addSuffix: true }));
        }
    }, [bid.timestamp]);

    const isAdmin = role === 'Admin';
    const showRealIdentity = isAdmin || isAwardedToThisBidder;

    const installerName = showRealIdentity ? installer.name : `Installer #${rank}`;

    return (
        <div className={`p-4 rounded-lg border ${isAwardedToThisBidder ? 'border-primary bg-primary/5' : ''} ${!isJobAwarded && showRanking && rank === 1 ? 'border-primary' : ''}`}>
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                    <Avatar>
                       {showRealIdentity ? (
                            <AvatarImage src={installer.realAvatarUrl} alt={installer.name} />
                       ) : (
                           <AnimatedAvatar svg={installer.avatarUrl} />
                       )}
                        <AvatarFallback>{showRealIdentity ? installer.name.substring(0, 2) : `I${rank}`}</AvatarFallback>
                    </Avatar>
                    <div>
                        <div className="flex items-center gap-2">
                           {isAdmin ? (
                                <Link href={`/dashboard/users/${installer.id}`} className="font-semibold hover:underline">{installerName}</Link>
                           ) : (
                                <p className="font-semibold">{installerName}</p>
                           )}
                            {!isJobAwarded && showRanking && rank === 1 && <Trophy className="h-4 w-4 text-amber-500" />}
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
            {role === 'Job Giver' && (
              <div className="mt-4 flex items-center gap-2">
                  <Button 
                      size="sm" 
                      onClick={() => canAward ? onAwardJob(installer.id) : onSelectInstaller(installer.id)}
                      disabled={isJobAwarded}
                      variant={isAwardedToThisBidder ? 'secondary' : 'default'}
                  >
                      {isAwardedToThisBidder ? (
                          <>
                              <Award className="mr-2 h-4 w-4" /> Awarded
                          </>
                      ) : canAward ? 'Award Job' : isSelected ? 'Selected' : 'Select Installer'}
                  </Button>
              </div>
            )}
        </div>
    );
}

function BidsSection({ job, onJobUpdate }: { job: Job, onJobUpdate: (updatedJob: Partial<Job>) => void }) {
    const { toast } = useToast();
    const { role } = useUser();
    const [selectedInstallers, setSelectedInstallers] = React.useState<string[]>(job.selectedInstallers?.map(i => i.installerId) || []);
    
    const handleSelectInstaller = async (installerId: string) => {
        const newSelected = [...selectedInstallers, installerId];
        const newSelectedWithRank = newSelected.map((id, index) => ({ installerId: id, rank: index + 1 }));

        const jobRef = doc(db, "jobs", job.id);
        await updateDoc(jobRef, { selectedInstallers: newSelectedWithRank });

        setSelectedInstallers(newSelected);
        onJobUpdate({ selectedInstallers: newSelectedWithRank });
        
        toast({
            title: "Installer Selected",
            description: `Installer has been shortlisted.`,
        });
    };
    
    const handleAwardJob = async (installerId: string) => {
        const installer = (job.bids || []).find(b => (b.installer as User).id === installerId)?.installer as User;
        if (!installer) return;

        const jobRef = doc(db, "jobs", job.id);
        await updateDoc(jobRef, {
            awardedInstaller: doc(db, 'users', installerId),
            status: 'Awarded'
        });

        onJobUpdate({ awardedInstaller: doc(db, 'users', installerId), status: 'Awarded' });

        toast({
            title: "Job Awarded!",
            description: `You have awarded the job to ${installer.name}.`,
        });
    };

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
          'Review the bids and award the job to the best installer.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {sortedBids.map(({ bid }, index) => (
          <JobGiverBid 
            key={(bid.installer as User).id}
            bid={bid} 
            job={job} 
            onSelectInstaller={handleSelectInstaller}
            onAwardJob={handleAwardJob}
            rank={index + 1}
            isSelected={selectedInstallers.includes((bid.installer as User).id)}
            showRanking={role === 'Job Giver'}
            canAward={role === 'Job Giver'}
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
  
  const awardedInstallerId = (job.awardedInstaller as DocumentReference)?.id || (job.awardedInstaller as User)?.id;
  const winningBid = (job.bids || []).find(b => ((b.installer as DocumentReference)?.id || (b.installer as User)?.id) === awardedInstallerId);
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

function CommentDisplay({ comment }: { comment: Comment }) {
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
                <AnimatedAvatar svg={author.avatarUrl} />
                <AvatarFallback>{author.name.substring(0, 2)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm">{author.name}</p>
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
            const jobRef = doc(db, "jobs", job.id);
            await updateDoc(jobRef, { jobStartDate: new Date(newDate) });
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

function RaiseDisputeDialog({ job, user, onJobUpdate, triggerElement }: { job: Job; user: User; onJobUpdate: (updatedPart: Partial<Job>) => void; triggerElement: React.ReactNode; }) {
    const { toast } = useToast();
    const [reason, setReason] = React.useState("");
    const [isOpen, setIsOpen] = React.useState(false);
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const handleRaiseDispute = async () => {
        if (!reason.trim()) {
            toast({ title: "Reason is required", variant: "destructive" });
            return;
        }
        setIsSubmitting(true);
        try {
            const awardedInstallerId = (job.awardedInstaller as DocumentReference)?.id || (job.awardedInstaller as User)?.id;
            const jobGiverId = (job.jobGiver as DocumentReference)?.id || (job.jobGiver as User)?.id;

            const disputeData = {
                jobId: job.id,
                jobTitle: job.title,
                status: 'Open' as const,
                reason,
                parties: {
                    jobGiverId,
                    installerId: awardedInstallerId,
                },
                messages: [{
                    authorId: user.id,
                    authorRole: user.roles[0],
                    content: reason,
                    timestamp: new Date()
                }],
                createdAt: new Date(),
            };

            const disputeRef = await addDoc(collection(db, "disputes"), disputeData);
            const jobRef = doc(db, "jobs", job.id);
            await updateDoc(jobRef, { disputeId: disputeRef.id });

            onJobUpdate({ disputeId: disputeRef.id });

            toast({
                title: "Dispute Raised Successfully",
                description: "An admin will review your case shortly. You can view the dispute from this page.",
            });
            setIsOpen(false);
        } catch (error) {
            console.error("Error raising dispute:", error);
            toast({ title: "Failed to raise dispute", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>{triggerElement}</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Raise a Dispute for "{job.title}"</DialogTitle>
                    <DialogDescription>
                        Explain the issue clearly. An admin will review the case. This action cannot be undone.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Textarea
                        placeholder="Clearly describe the problem, e.g., 'The work was not completed as agreed upon...' or 'Payment has not been released after completion...'"
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

export default function JobDetailPage() {
  const { user, role } = useUser();
  const params = useParams();
  const id = params.id as string;
  const { toast } = useToast();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  const [job, setJob] = React.useState<Job | null>(null);
  const [loading, setLoading] = React.useState(true);

  const [newComment, setNewComment] = React.useState("");

  const [newPrivateMessage, setNewPrivateMessage] = React.useState("");
  const [privateMessageAttachments, setPrivateMessageAttachments] = React.useState<File[]>([]);
  
  const [deadlineRelative, setDeadlineRelative] = React.useState('');
  const [deadlineAbsolute, setDeadlineAbsolute] = React.useState('');

   React.useEffect(() => {
    if (!id) return;
    setLoading(true);

    const fetchJob = async () => {
        try {
            const jobDocRef = doc(db, 'jobs', id);
            const jobSnapshot = await getDoc(jobDocRef);

            if (!jobSnapshot.exists()) {
                setJob(null);
                setLoading(false);
                return;
            }
            
            const jobData = jobSnapshot.data();
            
            const userCache: { [key: string]: User } = {};
            const getUser = async (ref: DocumentReference): Promise<User> => {
                if (userCache[ref.id]) return userCache[ref.id];
                const userSnap = await getDoc(ref);
                const userData = { id: userSnap.id, ...userSnap.data() } as User;
                userCache[ref.id] = userData;
                return userData;
            }

            const jobGiver = await getUser(jobData.jobGiver);

            const bids = await Promise.all((jobData.bids || []).map(async (bid: any) => ({
                ...bid,
                id: `${id}-${bid.installer.id}`,
                installer: await getUser(bid.installer),
            })));

            const comments = await Promise.all((jobData.comments || []).map(async (comment: any) => ({
                ...comment,
                id: comment.id || `${id}-comment-${Math.random()}`,
                author: await getUser(comment.author),
            })));
            
            const privateMessages = await Promise.all((jobData.privateMessages || []).map(async (message: any) => ({
                ...message,
                id: message.id || `${id}-pm-${Math.random()}`,
                author: await getUser(message.author),
            })));

            setJob({
                ...jobData,
                id: jobSnapshot.id,
                jobGiver,
                bids,
                comments,
                privateMessages,
            } as Job);
        } catch (error) {
            console.error("Failed to fetch job details:", error);
            setJob(null);
        } finally {
            setLoading(false);
        }
    };

    fetchJob();
}, [id]);

  const jobStartDate = React.useMemo(() => {
    if (job?.jobStartDate) {
      return format(toDate(job.jobStartDate), "MMM d, yyyy");
    }
    return 'Not set';
  }, [job?.jobStartDate]);

  React.useEffect(() => {
    if (job) {
        setDeadlineRelative(formatDistanceToNow(toDate(job.deadline), { addSuffix: true }));
        setDeadlineAbsolute(format(toDate(job.deadline), "MMM d, yyyy"));
    }
  }, [job]);

  const handleJobUpdate = (updatedPart: Partial<Job>) => {
    if (job) {
      setJob(currentJob => currentJob ? {...currentJob, ...updatedPart} : null);
    }
  };
  
  const handlePostComment = async () => {
    if (!newComment.trim() || !user || !job) return;

    const newCommentObject: Omit<Comment, 'id' | 'author'> & {author: DocumentReference} = {
      author: doc(db, 'users', user.id),
      timestamp: new Date(),
      content: newComment,
    };
    
    const jobRef = doc(db, "jobs", job.id);
    await updateDoc(jobRef, {
        comments: arrayUnion(newCommentObject)
    });

    const fullNewComment: Comment = {
      ...newCommentObject,
      id: `comment-${Date.now()}`,
      author: user,
    };
    
    handleJobUpdate({ comments: [...(job.comments || []), fullNewComment] });

    setNewComment("");
     toast({
      title: "Comment Posted!",
    });
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setPrivateMessageAttachments(prev => [...prev, ...Array.from(event.target.files!)]);
    }
  };

  const removeAttachment = (fileName: string) => {
    setPrivateMessageAttachments(prev => prev.filter(file => file.name !== fileName));
  };
  
  const handlePostPrivateMessage = async () => {
    if ((!newPrivateMessage.trim() && privateMessageAttachments.length === 0) || !user || !job) return;

    // Mock upload process for attachments
    const uploadedAttachments: JobAttachment[] = privateMessageAttachments.map(file => ({
        fileName: file.name,
        fileUrl: '#', // Placeholder URL
        fileType: file.type,
    }));

    const newMessageObject: Omit<PrivateMessage, 'id' | 'author'> & {author: DocumentReference} = {
      author: doc(db, 'users', user.id),
      timestamp: new Date(),
      content: newPrivateMessage,
      attachments: uploadedAttachments,
    };
    
    const jobRef = doc(db, "jobs", job.id);
    await updateDoc(jobRef, {
        privateMessages: arrayUnion(newMessageObject)
    });

    const fullNewMessage: PrivateMessage = {
      ...newMessageObject,
      id: `pm-${Date.now()}`,
      author: user,
    };
    
    handleJobUpdate({ privateMessages: [...(job.privateMessages || []), fullNewMessage] });

    setNewPrivateMessage("");
    setPrivateMessageAttachments([]);
     toast({
      title: "Message Sent!",
    });
  };

  if (loading) {
    return <PageSkeleton />;
  }

  if (!job || !user) {
    notFound();
  }

  const awardedInstallerId = (job.awardedInstaller as DocumentReference)?.id || (job.awardedInstaller as User)?.id;
  const isAwardedInstaller = role === "Installer" && user.id === awardedInstallerId;
  const jobGiver = job.jobGiver as User;
  const isJobGiver = role === "Job Giver" && user.id === jobGiver.id;

  const canRaiseDispute = (isJobGiver || isAwardedInstaller) && (job.status === 'In Progress' || job.status === 'Completed');
  const canPostPublicComment = job.status === 'Open for Bidding' && (role === 'Installer' || role === 'Job Giver' || role === 'Admin');
  const canUsePrivateMessages = (isJobGiver || isAwardedInstaller || role === 'Admin') && ['Awarded', 'In Progress', 'Completed'].includes(job.status);
  
  return (
    <div className="grid gap-8 md:grid-cols-3">
      <div className="md:col-span-2 grid gap-8">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
                <div>
                    <Badge variant={getStatusVariant(job.status)} className="mb-2">{job.status}</Badge>
                    <CardTitle className="text-2xl">{job.title}</CardTitle>
                </div>
                <div className="flex items-center gap-3">
                    <Avatar>
                        <AnimatedAvatar svg={jobGiver.avatarUrl} />
                        <AvatarFallback>{jobGiver.name.substring(0, 2)}</AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="text-sm font-semibold">{jobGiver.name}</p>
                        <p className="text-xs text-muted-foreground">Job Giver (Member since {format(toDate(jobGiver.memberSince), 'MMM yyyy')})</p>
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
                             <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                multiple
                                className="hidden"
                              />
                             {privateMessageAttachments.length > 0 && (
                                <div className="space-y-2">
                                    {privateMessageAttachments.map(file => (
                                        <div key={file.name} className="flex items-center justify-between text-xs bg-muted p-2 rounded-md">
                                            <span>{file.name}</span>
                                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeAttachment(file.name)}>
                                                <X className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div className="flex justify-between items-center">
                                <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                                    <Paperclip className="mr-2 h-4 w-4" />
                                    Attach
                                </Button>
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
                    {(job.comments || []).map((comment) => (
                        <CommentDisplay key={comment.id} comment={comment} />
                    ))}
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

            {(job.status === 'Awarded' || job.status === 'In Progress') && isAwardedInstaller && (
              <>
                <Separator className="my-6" />
                <InstallerCompletionSection job={job} onJobUpdate={handleJobUpdate} />
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
        {(role === "Job Giver" || role === "Admin") && job.bids.length > 0 && <BidsSection job={job} onJobUpdate={handleJobUpdate} />}

      </div>

      <div className="space-y-8">
        {(role === 'Job Giver' && (job.status === 'Awarded' || job.status === 'In Progress')) && (
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
                    triggerElement={
                      <Button variant="destructive" className="w-full">
                        <AlertOctagon className="mr-2 h-4 w-4" />
                        Raise a Dispute
                      </Button>
                    }
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
