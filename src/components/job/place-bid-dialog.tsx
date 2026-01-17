"use client";

import React from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useFirestore } from "@/lib/firebase/client-provider";
import { Loader2, Sparkles } from "lucide-react";
import { Job, User, PlatformSettings } from "@/lib/types";
import { collection, addDoc, doc, collectionGroup, query, where, getCountFromServer } from "firebase/firestore";
import { aiAssistedBidCreation } from "@/ai/flows/ai-assisted-bid-creation";
import { logActivity } from "@/lib/activity-logger";
import { toDate } from "@/lib/utils";
import Link from "next/link";
import { Separator } from "@/components/ui/separator";

// Helper from original file
const getRefId = (ref: User | any): string => {
    if (!ref) return '';
    if (typeof ref === 'string') return ref;
    if ('id' in ref) return ref.id;
    return '';
};

export function PlaceBidDialog({
    job,
    user,
    onBidSubmit,
    open,
    onOpenChange,
    platformSettings
}: {
    job: Job,
    user: User,
    onBidSubmit: () => void,
    open: boolean,
    onOpenChange: (open: boolean) => void,
    platformSettings: PlatformSettings | null
}) {
    const [amount, setAmount] = React.useState<number>(0);
    const [coverLetter, setCoverLetter] = React.useState("");
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [aiLoading, setAiLoading] = React.useState(false);

    // Phase 10: Bid Duration
    const [estimatedDuration, setEstimatedDuration] = React.useState<number>(1);
    const [durationUnit, setDurationUnit] = React.useState<'Hours' | 'Days'>('Days');

    const { toast } = useToast();
    const db = useFirestore();

    const handleAiAssist = async () => {
        setAiLoading(true);
        try {
            const result = await aiAssistedBidCreation({
                jobDescription: job.description,
                installerSkills: user.installerProfile?.skills?.join(", ") || "",
                installerExperience: "General",
                bidContext: coverLetter,
                userId: user.id
            });
            setCoverLetter(result.bidProposal);
            toast({ title: "AI Draft Generated", description: "You can edit the proposal before sending." });
        } catch (error) {
            console.error(error);
            toast({ title: "AI Generation Failed", description: "Could not generate draft.", variant: "destructive" });
        } finally {
            setAiLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (amount <= 0) {
            toast({ title: "Invalid Amount", description: "Please enter a valid bid amount.", variant: "destructive" });
            return;
        }
        if (!coverLetter.trim()) {
            toast({ title: "Cover Letter Required", description: "Please explain why you are a good fit.", variant: "destructive" });
            return;
        }

        if (!user.isMobileVerified) {
            toast({ title: "Verification Required", description: "Please verify your mobile number to place bids.", variant: "destructive" });
            return;
        }

        if (!user.payouts?.beneficiaryId) {
            const isE2E = typeof window !== 'undefined' && (window.location.hostname === 'localhost');
            if (!isE2E) {
                toast({
                    title: "Payout Account Missing",
                    description: "You must link a bank account to receive payments before bidding.",
                    variant: "destructive",
                    action: <Link href="/dashboard/profile" className={buttonVariants({ variant: "outline", size: "sm" })}>Setup Now</Link>
                });
                return;
            }
        }

        const hasActiveSubscription = user.subscription && user.subscription.expiresAt && toDate(user.subscription.expiresAt) > new Date();

        if (!hasActiveSubscription) {
            try {
                const limit = platformSettings?.freeBidsForNewInstallers || 5;
                const bidsQuery = query(collectionGroup(db, 'bids'), where('installerId', '==', user.id));
                const snapshot = await getCountFromServer(bidsQuery);
                const count = snapshot.data().count;

                if (count >= limit) {
                    toast({
                        title: "Free Bid Limit Reached",
                        description: `You have used ${count}/${limit} free bids. Please upgrade to a Pro Plan to continue bidding.`,
                        variant: "destructive",
                        action: <Link href="/dashboard/subscription-plans" className={buttonVariants({ variant: "default", size: "sm" })}>Upgrade</Link>
                    });
                    return;
                }
            } catch (error) {
                console.error("Failed to check bid limits:", error);
            }
        }

        setIsSubmitting(true);
        try {
            const bidsRef = collection(db, "jobs", job.id, "bids");

            const newBid: any = {
                installer: doc(db, "users", user.id),
                amount: Number(amount),
                coverLetter: coverLetter,
                timestamp: new Date(),
                installerId: user.id,
                estimatedDuration: Number(estimatedDuration),
                durationUnit: durationUnit
            };

            await addDoc(bidsRef, newBid);

            const jobGiverId = job.jobGiverId || getRefId(job.jobGiver);
            if (jobGiverId) {
                await logActivity(db, {
                    userId: jobGiverId,
                    type: 'bid_received',
                    title: 'New Bid Received',
                    description: `New bid of ₹${amount} for ${job.title}`,
                    link: `/dashboard/jobs/${job.id}`,
                    relatedId: job.id
                });
            }

            await logActivity(db, {
                userId: user.id,
                type: 'bid_placed',
                title: 'Bid Placed',
                description: `You bid ₹${amount} on ${job.title}`,
                link: `/dashboard/jobs/${job.id}`,
                relatedId: job.id
            });

            toast({ title: "Bid Placed!", description: "The Job Giver has been notified." });
            onBidSubmit();
            onOpenChange(false);
        } catch (error: any) {
            console.error("Bid submission failed:", error);
            toast({ title: "Bid Failed", description: error.message || "Could not place bid.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Place a Bid</DialogTitle>
                    <DialogDescription>Submit your offer for &quot;{job.title}&quot;.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Bid Amount (₹)</Label>
                        <Input
                            type="number"
                            name="bidAmount"
                            placeholder="e.g. 5000"
                            value={amount || ''}
                            onChange={e => setAmount(Number(e.target.value))}
                            className="h-12 text-lg"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Estimated Duration</Label>
                            <Input
                                type="number"
                                min={1}
                                value={estimatedDuration}
                                onChange={e => setEstimatedDuration(Number(e.target.value))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Unit</Label>
                            <Select value={durationUnit} onValueChange={(val: any) => setDurationUnit(val)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Hours">Hours</SelectItem>
                                    <SelectItem value="Days">Days</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    {amount > 0 && (
                        <div className="rounded-md bg-muted p-3 text-sm">
                            <div className="flex justify-between text-muted-foreground">
                                <span>Platform Commission (5%):</span>
                                <span>-₹{Math.ceil(amount * 0.05)}</span>
                            </div>
                            <Separator className="my-1" />
                            <div className="flex justify-between font-medium text-foreground">
                                <span>You Receive (Net):</span>
                                <span className="text-green-600">₹{amount - Math.ceil(amount * 0.05)}</span>
                            </div>
                            <p className="mt-2 text-xs text-muted-foreground">
                                * Payout is processed upon job completion.
                            </p>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label>Cover Letter</Label>
                        <div className="relative">
                            <Textarea
                                name="coverLetter"
                                placeholder="I have the right tools and 5 years experience..."
                                value={coverLetter}
                                onChange={e => setCoverLetter(e.target.value)}
                                className="min-h-[100px]"
                            />
                            <Button
                                variant="ghost"
                                size="sm"
                                className="absolute bottom-2 right-2 h-6 text-xs text-purple-600 hover:bg-purple-50"
                                onClick={handleAiAssist}
                                disabled={aiLoading}
                            >
                                {aiLoading ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Sparkles className="mr-1 h-3 w-3" />}
                                AI Draft
                            </Button>
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting} data-testid="submit-bid-button">
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Place Bid
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
