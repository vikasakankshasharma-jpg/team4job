
"use client";

import { useUser } from "@/hooks/use-user";
import { jobs, users } from "@/lib/data";
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
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import React from "react";
import { aiAssistedBidCreation } from "@/ai/flows/ai-assisted-bid-creation";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Bid, Job, Comment } from "@/lib/types";
import { AnimatedAvatar } from "@/components/ui/animated-avatar";
import { getStatusVariant } from "@/lib/utils";

function InstallerBidSection({ job }: { job: Job }) {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [bidProposal, setBidProposal] = React.useState("");

  const installer = users.find(u => u.id === 'user-1')?.installerProfile;
  if (!installer) return null;

  const handleGenerateBid = async () => {
    setIsGenerating(true);
    try {
      const result = await aiAssistedBidCreation({
        jobDescription: job.description,
        installerSkills: installer.skills.join(', '),
        installerExperience: `${installer.jobsCompleted} jobs completed with a ${installer.rating} rating.`,
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
          <Input type="number" placeholder="Your bid amount (₹)" className="flex-1" />
          <Button>Place Bid</Button>
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
    const [timeAgo, setTimeAgo] = React.useState('');
    const isAwardedToThisBidder = job.awardedInstaller === bid.installer.id;
    const isJobAwarded = !!job.awardedInstaller;

    React.useEffect(() => {
        if(bid.timestamp) {
            setTimeAgo(formatDistanceToNow(new Date(bid.timestamp), { addSuffix: true }));
        }
    }, [bid.timestamp]);

    return (
        <div className={`p-4 rounded-lg border ${isAwardedToThisBidder ? 'border-primary bg-primary/5' : ''} ${!isJobAwarded && showRanking && rank === 1 ? 'border-primary' : ''}`}>
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                    <Avatar>
                       {isAwardedToThisBidder ? (
                            <AvatarImage src={bid.installer.realAvatarUrl} alt={bid.installer.name} />
                       ) : (
                           <AnimatedAvatar svg={bid.installer.avatarUrl} />
                       )}
                        <AvatarFallback>{isAwardedToThisBidder ? bid.installer.name.substring(0, 2) : bid.installer.anonymousId.substring(0, 2)}</AvatarFallback>
                    </Avatar>
                    <div>
                        <div className="flex items-center gap-2">
                            <p className="font-semibold">{isAwardedToThisBidder ? bid.installer.name : showRanking ? `Position #${rank}` : bid.installer.anonymousId}</p>
                            {!isAwardedToThisBidder && showRanking && rank === 1 && <Trophy className="h-4 w-4 text-amber-500" />}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Star className="h-3 w-3 fill-primary text-primary" />
                            <span>{bid.installer.installerProfile?.rating} ({bid.installer.installerProfile?.reviews} reviews)</span>
                            <span className="font-mono">{isAwardedToThisBidder ? bid.installer.anonymousId : ''}</span>
                            {bid.installer.installerProfile?.verified && <ShieldCheck className="h-3 w-3 text-green-600" />}
                        </div>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-lg font-bold">₹{bid.amount.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{timeAgo}</p>
                </div>
            </div>
            <p className="mt-4 text-sm text-foreground">{bid.coverLetter}</p>
            <div className="mt-4 flex items-center gap-2">
                 <Button 
                    size="sm" 
                    onClick={() => canAward ? onAwardJob(bid.installer.id) : onSelectInstaller(bid.installer.id)}
                    disabled={isJobAwarded || isSelected}
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
        </div>
    );
}

function JobGiverBidsSection({ job, onJobUpdate }: { job: Job, onJobUpdate: (updatedJob: Job) => void }) {
    const { toast } = useToast();
    const [selectedInstallers, setSelectedInstallers] = React.useState<string[]>(job.selectedInstallers?.map(i => i.installerId) || []);

    const canAwardDirectly = job.bids.length < 3;

    const handleSelectInstaller = (installerId: string) => {
        // This is a temporary implementation for the first phase.
        // It just marks the installer as selected in the UI.
        const newSelected = [...selectedInstallers, installerId];
        setSelectedInstallers(newSelected);

        const updatedJob = { ...job, selectedInstallers: newSelected.map((id, index) => ({ installerId: id, rank: index + 1 })) };
        onJobUpdate(updatedJob);
        
        toast({
            title: "Installer Selected for Ranking",
            description: `You have selected installer ${users.find(u=>u.id === installerId)?.anonymousId} for your shortlist.`,
        });
    };
    
    const handleAwardJob = (installerId: string) => {
        const installer = users.find(u => u.id === installerId);
        if (!installer) return;

        const updatedJob = { ...job, awardedInstaller: installerId, status: 'Awarded' as Job['status'] };
        onJobUpdate(updatedJob);

        toast({
            title: "Job Awarded!",
            description: `You have awarded the job to ${installer.anonymousId}.`,
            variant: "success",
        });
    };

    const calculateBidScore = (bid: Bid, job: Job) => {
        const profile = bid.installer.installerProfile;
        if (!profile) return -Infinity;

        // Price Score (lower is better, normalized)
        // A bid at the min budget gets 1, at max budget gets 0. Bids below min get > 1.
        const priceRange = job.budget.max - job.budget.min;
        const priceScore = priceRange > 0 ? (job.budget.max - bid.amount) / priceRange : 1;
        
        // Rating Score (0-5 scale to 0-1 scale)
        const ratingScore = profile.rating / 5;

        // Reputation Score (logarithmic to handle large numbers, normalized somewhat arbitrarily)
        const reputationScore = Math.log1p(profile.points) / Math.log1p(3000); // 3000 is a hypothetical max points

        // Weights
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
    <Card>
      <CardHeader>
        <CardTitle>Received Bids ({job.bids.length})</CardTitle>
        <CardDescription>
          {job.awardedInstaller ? 'An installer has been selected for this job.' : 
          canAwardDirectly ? 'Award the job to the best installer.' : 'Review the ranked bids and select your top candidates.'}
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
            isSelected={selectedInstallers.includes(bid.installer.id)}
            showRanking={!canAwardDirectly}
            canAward={canAwardDirectly}
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

  const installer = users.find(u => u.id === job.awardedInstaller);
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

    React.useEffect(() => {
        if (comment.timestamp) {
            setTimeAgo(formatDistanceToNow(new Date(comment.timestamp), { addSuffix: true }));
        }
    }, [comment.timestamp]);

    return (
        <div key={comment.id} className="flex gap-3">
            <Avatar className="h-9 w-9">
                <AnimatedAvatar svg={comment.author.avatarUrl} />
                <AvatarFallback>{comment.author.anonymousId.substring(0, 2)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
                {!isEditing ? (
                <>
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm">{comment.author.anonymousId}</p>
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

export default function JobDetailPage() {
  const { user, role } = useUser();
  const params = useParams();
  const id = params.id as string;
  const { toast } = useToast();
  
  const [job, setJob] = React.useState<Job | null | undefined>(undefined);
  const [jobComments, setJobComments] = React.useState<Comment[]>([]);
  const [editingCommentId, setEditingCommentId] = React.useState<string | null>(null);
  const [editingContent, setEditingContent] = React.useState("");
  
  const [deadlineRelative, setDeadlineRelative] = React.useState('');
  const [deadlineAbsolute, setDeadlineAbsolute] = React.useState('');
  const [jobStartDate, setJobStartDate] = React.useState('');

  React.useEffect(() => {
    if (id) {
      const foundJob = jobs.find((j) => j.id === id);
      setJob(foundJob || null);
      if (foundJob) {
        setJobComments(foundJob.comments);
        setDeadlineRelative(formatDistanceToNow(new Date(foundJob.deadline), { addSuffix: true }));
        setDeadlineAbsolute(format(new Date(foundJob.deadline), "MMM d, yyyy"));
        if(foundJob.jobStartDate){
          setJobStartDate(format(new Date(foundJob.jobStartDate), "MMM d, yyyy"));
        }
      }
    }
  }, [id]);

  const handleJobUpdate = (updatedJob: Job) => {
    // This is a mock update. In a real app, you'd send this to your backend.
    const jobIndex = jobs.findIndex(j => j.id === updatedJob.id);
    if (jobIndex !== -1) {
        jobs[jobIndex] = updatedJob;
    }
    setJob(updatedJob);
  };

  if (job === undefined || !user) {
    return <PageSkeleton />;
  }

  if (job === null) {
    notFound();
  }
  
  const handleEditComment = (commentId: string, content: string) => {
    setEditingCommentId(commentId);
    setEditingContent(content);
  };
  
  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditingContent("");
  };

  const handleSaveEdit = (commentId: string) => {
    setJobComments(jobComments.map(c => 
      c.id === commentId ? { ...c, content: editingContent, timestamp: new Date() } : c
    ));
    setEditingCommentId(null);
    setEditingContent("");
    toast({
      title: "Comment Updated",
      description: "Your comment has been successfully updated.",
    });
  };

  const handleDeleteComment = (commentId: string) => {
    setJobComments(jobComments.filter(c => c.id !== commentId));
    toast({
      title: "Comment Deleted",
      description: "Your comment has been successfully removed.",
    });
  };

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
                        <AnimatedAvatar svg={job.jobGiver.avatarUrl} />
                        <AvatarFallback>{job.jobGiver.anonymousId.substring(0, 2)}</AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="text-sm font-semibold">{job.jobGiver.anonymousId}</p>
                        <p className="text-xs text-muted-foreground">Job Giver (Member since {format(job.jobGiver.memberSince, 'MMM yyyy')})</p>
                    </div>
                </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-foreground">{job.description}</p>
            
            {job.status === 'Open for Bidding' ? (
              <>
                <Separator className="my-6" />
                <h3 className="font-semibold mb-4">Comments ({jobComments.length})</h3>
                <div className="space-y-6">
                    {jobComments.map((comment, index) => {
                        const isEditing = editingCommentId === comment.id;
                        return (
                            <CommentDisplay
                                key={comment.id}
                                comment={comment}
                                isEditing={isEditing}
                                canEdit={user?.id === comment.author.id}
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
                            <Textarea placeholder="Ask a question or post a comment..." />
                            <div className="flex justify-end mt-2">
                               <Button size="sm">Post Comment</Button>
                            </div>
                        </div>
                    </div>
                </div>
              </>
            ) : (
                 job.status === 'Completed' && (
                    <>
                        <Separator className="my-6" />
                        <ReputationImpactCard job={job} />
                    </>
                 )
            )}
          </CardContent>
        </Card>

        {role === "Installer" && job.status === "Open for Bidding" && <InstallerBidSection job={job}/>}
        {role === "Job Giver" && <JobGiverBidsSection job={job} onJobUpdate={handleJobUpdate} />}

      </div>

      <div className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Job Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-foreground">
            <div className="flex items-center gap-3">
              <IndianRupee className="h-5 w-5" />
              <div>
                <p className="text-muted-foreground">Budget</p>
                <p className="font-semibold">₹{job.budget.min.toLocaleString()} - ₹{job.budget.max.toLocaleString()}</p>
              </div>
            </div>
             <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5" />
              <div>
                <p className="text-muted-foreground">Location</p>
                <p className="font-semibold">{job.location}</p>
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
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5" />
              <div>
                <p className="text-muted-foreground">Bids</p>
                <p className="font-semibold">{job.bids.length} Received</p>
              </div>
            </div>
             <div className="flex items-center gap-3">
              <MessageSquare className="h-5 w-5" />
              <div>
                <p className="text-muted-foreground">Comments</p>
                <p className="font-semibold">{jobComments.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
      </div>
    </div>
  );
}

    