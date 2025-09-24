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
  Clock,
  IndianRupee,
  MapPin,
  MessageSquare,
  Paperclip,
  ShieldCheck,
  Star,
  Users,
  Zap,
  Loader2
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import React from "react";
import { aiAssistedBidCreation } from "@/ai/flows/ai-assisted-bid-creation";
import { useToast } from "@/hooks/use-toast";

function InstallerBidSection({ job }: { job: (typeof jobs)[0] }) {
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

function JobGiverBidsSection({ job }: { job: (typeof jobs)[0] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Received Bids ({job.bids.length})</CardTitle>
        <CardDescription>
          Review the bids from installers and select the best fit.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {job.bids.map((bid) => (
          <div key={bid.id} className="border p-4 rounded-lg">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={bid.installer.avatarUrl} alt={bid.installer.name} data-ai-hint="person face" />
                  <AvatarFallback>{bid.installer.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{bid.installer.name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Star className="h-3 w-3 fill-primary text-primary" />
                    <span>{bid.installer.installerProfile?.rating} ({bid.installer.installerProfile?.reviews} reviews)</span>
                    {bid.installer.installerProfile?.verified && <ShieldCheck className="h-3 w-3 text-green-600" />}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold">₹{bid.amount.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{formatDistanceToNow(bid.timestamp, { addSuffix: true })}</p>
              </div>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">{bid.coverLetter}</p>
            <div className="mt-4 flex gap-2">
              <Button size="sm">Select Installer</Button>
              <Button size="sm" variant="outline">Message</Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default function JobDetailPage() {
  const { role } = useUser();
  const params = useParams();
  const id = params.id as string;
  const job = jobs.find((j) => j.id === id);

  if (!job) {
    notFound();
  }

  return (
    <div className="grid gap-8 md:grid-cols-3">
      <div className="md:col-span-2 grid gap-8">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
                <div>
                    <Badge variant="secondary" className="mb-2">{job.status}</Badge>
                    <CardTitle className="text-2xl">{job.title}</CardTitle>
                </div>
                <div className="flex items-center gap-3">
                    <Avatar>
                        <AvatarImage src={job.jobGiver.avatarUrl} alt={job.jobGiver.name} data-ai-hint="person face" />
                        <AvatarFallback>{job.jobGiver.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="text-sm font-semibold">{job.jobGiver.name}</p>
                        <p className="text-xs text-muted-foreground">Job Giver</p>
                    </div>
                </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{job.description}</p>
            <Separator className="my-6" />
            <h3 className="font-semibold mb-4">Comments ({job.comments.length})</h3>
            <div className="space-y-6">
                {job.comments.map(comment => (
                    <div key={comment.id} className="flex gap-3">
                        <Avatar className="h-9 w-9">
                            <AvatarImage src={comment.author.avatarUrl} alt={comment.author.name} data-ai-hint="person face" />
                            <AvatarFallback>{comment.author.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                            <div className="flex justify-between items-center">
                                <p className="font-semibold text-sm">{comment.author.name}</p>
                                <p className="text-xs text-muted-foreground">{formatDistanceToNow(comment.timestamp, { addSuffix: true })}</p>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">{comment.content}</p>
                        </div>
                    </div>
                ))}
                 <div className="flex gap-3">
                    <Avatar className="h-9 w-9">
                        <AvatarImage src={users[0].avatarUrl} alt={users[0].name} data-ai-hint="person face" />
                        <AvatarFallback>{users[0].name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                        <Textarea placeholder="Ask a question or post a comment..." />
                        <div className="flex justify-end mt-2">
                           <Button size="sm">Post Comment</Button>
                        </div>
                    </div>
                </div>
            </div>
          </CardContent>
        </Card>

        {role === "Installer" && job.status === "Open for Bidding" && <InstallerBidSection job={job}/>}
        {role === "Job Giver" && <JobGiverBidsSection job={job}/>}

      </div>

      <div className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Job Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex items-center gap-3">
              <IndianRupee className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">Budget</p>
                <p className="font-semibold">₹{job.budget.min.toLocaleString()} - ₹{job.budget.max.toLocaleString()}</p>
              </div>
            </div>
             <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">Location</p>
                <p className="font-semibold">{job.location}</p>
              </div>
            </div>
             <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">Bidding Ends</p>
                <p className="font-semibold">{formatDistanceToNow(job.deadline, { addSuffix: true })} ({format(job.deadline, "MMM d, yyyy")})</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">Bids</p>
                <p className="font-semibold">{job.bids.length} Received</p>
              </div>
            </div>
             <div className="flex items-center gap-3">
              <MessageSquare className="h-5 w-5 text-muted-foreground" />
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
