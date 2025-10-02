
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
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import React from "react";
import { aiAssistedBidCreation } from "@/ai/flows/ai-assisted-bid-creation";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Bid, Job, Comment, User } from "@/lib/types";
import { jobs, users } from "@/lib/data";
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


function InstallerCompletionSection({ job, onJobUpdate }: { job: Job, onJobUpdate: (updatedJob: Partial<Job>) => void }) {
  const { toast } = useToast();
  const [otp, setOtp] = React.useState('');

  const handleCompleteJob = async () => {
    if (otp === job.completionOtp) {
      const updatedData = { 
        status: 'Completed' as const,
        rating: 5, // Default rating, can be changed by job giver
      };
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
          Job Completion OTP provided by the Job Giver to mark it as complete.
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
    const newBid: Bid = {
      id: `bid-${job.id}-${user.id}`,
      installer: user,
      amount: Number(bidAmount),
      timestamp: new Date(),
      coverLetter: bidProposal
    };

    onJobUpdate({ bids: [...job.bids, newBid] });

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
    const isAwardedToThisBidder = job.awardedInstaller === installer.id;
    const isJobAwarded = !!job.awardedInstaller;

    React.useEffect(() => {
        if(bid.timestamp) {
            setTimeAgo(formatDistanceToNow(toDate(bid.timestamp), { addSuffix: true }));
        }
    }, [bid.timestamp]);

    return (
        <div className={`p-4 rounded-lg border ${isAwardedToThisBidder ? 'border-primary bg-primary/5' : ''} ${!isJobAwarded && showRanking && rank === 1 ? 'border-primary' : ''}`}>
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                    <Avatar>
                       {isAwardedToThisBidder ? (
                            <AvatarImage src={installer.realAvatarUrl} alt={installer.name} />
                       ) : (
                           <AnimatedAvatar svg={installer.avatarUrl} />
                       )}
                        <AvatarFallback>{isAwardedToThisBidder ? installer.name.substring(0, 2) : installer.anonymousId.substring(0, 2)}</AvatarFallback>
                    </Avatar>
                    <div>
                        <div className="flex items-center gap-2">
                            <p className="font-semibold">{isAwardedToThisBidder ? installer.name : showRanking ? `Position #${rank}` : installer.anonymousId}</p>
                            {!isJobAwarded && showRanking && rank === 1 && <Trophy className="h-4 w-4 text-amber-500" />}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Star className="h-3 w-3 fill-primary text-primary" />
                            <span>{installer.installerProfile?.rating} ({installer.installerProfile?.reviews} reviews)</span>
                            {!isAwardedToThisBidder && <span className="font-mono">{installer.anonymousId}</span>}
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
                  <Button size="sm" variant="outline">Message</Button>
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
        setSelectedInstallers(newSelected);
        
        onJobUpdate({ selectedInstallers: newSelected.map((id, index) => ({ installerId: id, rank: index + 1 })) });
        
        toast({
            title: "Installer Selected",
            description: `Installer has been shortlisted.`,
        });
    };
    
    const handleAwardJob = async (installerId: string) => {
        const installer = job.bids.find(b => (b.installer as User).id === installerId)?.installer as User;
        if (!installer) return;

        onJobUpdate({ awardedInstaller: installerId, status: 'Awarded' });

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
        <CardTitle>Received Bids ({job.bids.length})</CardTitle>
        <CardDescription>
          {job.awardedInstaller ? 'An installer has been selected for this job.' : 
          'Review the bids and award the job to the best installer.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {sortedBids.map(({ bid }, index) => (
          <JobGiverBid 
            key={bid.id} 
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

  const installerId = (job.awardedInstaller as User)?.id || job.awardedInstaller;
  const winningBid = job.bids.find(b => (b.installer as User).id === installerId);
  const installer = winningBid?.installer as User;

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
        <CardDescription>Reputation points awarded to {installer?.anonymousId} for this job.</CardDescription>
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

function CommentDisplay({ comment, isEditing, canEdit, handleEditComment, handleDeleteComment, handleCancelEdit, handleSaveEdit, editingContent, setEditingContent }) {
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
                <AvatarFallback>{author.anonymousId.substring(0, 2)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
                {!isEditing ? (
                <>
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm">{author.anonymousId}</p>
                        <p className="text-xs text-muted-foreground">{timeAgo}</p>
                        </div>
                        {canEdit && (
                            <div className="flex items-center">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => handleEditComment(comment.id, comment.content)}
                                >
                                    <Pencil className="h-4 w-4 text-muted-foreground" />
                                    <span className="sr-only">Edit comment</span>
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => handleDeleteComment(comment.id)}
                                >
                                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                                    <span className="sr-only">Delete comment</span>
                                </Button>
                            </div>
                        )}
                    </div>
                    <p className="text-sm mt-1 text-foreground">{comment.content}</p>
                </>
                ) : (
                    <div className="space-y-2">
                        <Textarea 
                            value={editingContent}
                            onChange={(e) => setEditingContent(e.target.value)}
                            className="min-h-24"
                        />
                        <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={handleCancelEdit}>Cancel</Button>
                            <Button size="sm" onClick={() => handleSaveEdit(comment.id)}>Save</Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function EditDateDialog({ job, onJobUpdate, triggerElement }: { job: Job; onJobUpdate: (updatedPart: Partial<Job>) => void; triggerElement: React.ReactNode }) {
    const { toast } = useToast();
    const [newDate, setNewDate] = React.useState<string>(job.jobStartDate ? format(toDate(job.jobStartDate), "yyyy-MM-dd") : "");
    const [isOpen, setIsOpen] = React.useState(false);

    const handleSave = () => {
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

export default function JobDetailPage() {
  const { user, role } = useUser();
  const params = useParams();
  const id = params.id as string;
  const { toast } = useToast();
  
  const [allJobs, setAllJobs] = React.useState<Job[]>(jobs);
  const job = allJobs.find(j => j.id === id);

  const [editingCommentId, setEditingCommentId] = React.useState<string | null>(null);
  const [editingContent, setEditingContent] = React.useState("");
  const [newComment, setNewComment] = React.useState("");
  
  const [deadlineRelative, setDeadlineRelative] = React.useState('');
  const [deadlineAbsolute, setDeadlineAbsolute] = React.useState('');

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
      setAllJobs(currentJobs => currentJobs.map(j => j.id === job.id ? {...j, ...updatedPart} : j));
    }
  };

  if (!job || !user) {
    // In a real app with async data, show a skeleton
    if(!job) notFound();
    return <PageSkeleton />;
  }
  
  const handleEditComment = (commentId: string, content: string) => {
    setEditingCommentId(commentId);
    setEditingContent(content);
  };
  
  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditingContent("");
  };

  const updateComments = (updatedComments: Comment[]) => {
    handleJobUpdate({ comments: updatedComments });
  };

  const handleSaveEdit = (commentId: string) => {
    const updatedComments = job.comments.map(c => 
      c.id === commentId ? { ...c, content: editingContent, timestamp: new Date() } : c
    );
    updateComments(updatedComments);
    setEditingCommentId(null);
    setEditingContent("");
    toast({
      title: "Comment Updated",
      description: "Your comment has been successfully updated.",
    });
  };

  const handleDeleteComment = (commentId: string) => {
    const updatedComments = job.comments.filter(c => c.id !== commentId);
    updateComments(updatedComments);
    toast({
      title: "Comment Deleted",
      description: "Your comment has been successfully removed.",
    });
  };
  
  const handlePostComment = async () => {
    if (!newComment.trim() || !user || !job) return;
    const comment: Comment = {
      id: `comment-${Date.now()}`,
      author: user,
      timestamp: new Date(),
      content: newComment,
    };
    
    handleJobUpdate({ comments: [...job.comments, comment] });

    setNewComment("");
     toast({
      title: "Comment Posted!",
    });
  };

  const isAwardedInstaller = role === "Installer" && user.id === ((job.awardedInstaller as User)?.id || job.awardedInstaller);
  const jobGiver = job.jobGiver as User;

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
                        <AvatarFallback>{jobGiver.anonymousId.substring(0, 2)}</AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="text-sm font-semibold">{jobGiver.anonymousId}</p>
                        <p className="text-xs text-muted-foreground">Job Giver (Member since {format(toDate(jobGiver.memberSince), 'MMM yyyy')})</p>
                    </div>
                </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-foreground">{job.description}</p>
            
            {job.status === 'Open for Bidding' && (
              <>
                <Separator className="my-6" />
                <h3 className="font-semibold mb-4">Comments ({job.comments.length})</h3>
                <div className="space-y-6">
                    {job.comments.map((comment) => {
                        const isEditing = editingCommentId === comment.id;
                        return (
                            <CommentDisplay
                                key={comment.id}
                                comment={comment}
                                isEditing={isEditing}
                                canEdit={user?.id === (comment.author as User).id}
                                handleEditComment={handleEditComment}
                                handleDeleteComment={handleDeleteComment}
                                handleCancelEdit={handleCancelEdit}
                                handleSaveEdit={handleSaveEdit}
                                editingContent={editingContent}
                                setEditingContent={setEditingContent}
                            />
                        )
                    })}
                     <div className="flex gap-3">
                        <Avatar className="h-9 w-9">
                            <AnimatedAvatar svg={user?.avatarUrl} />
                            <AvatarFallback>{user?.anonymousId.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                            <Textarea 
                              placeholder="Ask a question or post a comment..." 
                              value={newComment}
                              onChange={(e) => setNewComment(e.target.value)}
                            />
                            <div className="flex justify-end mt-2">
                               <Button size="sm" onClick={handlePostComment} disabled={!newComment.trim()}>Post Comment</Button>
                            </div>
                        </div>
                    </div>
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
        {(role === "Job Giver" || role === "Admin") && <BidsSection job={job} onJobUpdate={handleJobUpdate} />}

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
               {role === 'Admin' ? (
                   <EditDateDialog
                      job={job}
                      onJobUpdate={handleJobUpdate}
                      triggerElement={
                          <div className="cursor-pointer">
                              <p className="text-muted-foreground">Work Starts</p>
                              <p className="font-semibold">{jobStartDate}</p>
                          </div>
                      }
                  />
              ) : (
                  <div>
                      <p className="text-muted-foreground">Work Starts</p>
                      <p className="font-semibold">{jobStartDate}</p>
                  </div>
              )}
            </div>
            {role === 'Admin' ? (
              <Link href="#bids-section" className="flex items-center gap-3 cursor-pointer">
                <Users className="h-5 w-5" />
                <div>
                  <p className="text-muted-foreground">Bids</p>
                  <p className="font-semibold hover:underline">{job.bids.length} Received</p>
                </div>
              </Link>
            ) : (
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5" />
                <div>
                  <p className="text-muted-foreground">Bids</p>
                  <p className="font-semibold">{job.bids.length} Received</p>
                </div>
              </div>
            )}
             <div className="flex items-center gap-3">
              <MessageSquare className="h-5 w-5" />
              <div>
                <p className="text-muted-foreground">Comments</p>
                <p className="font-semibold">{job.comments.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
      </div>
    </div>
  );
}

    

    