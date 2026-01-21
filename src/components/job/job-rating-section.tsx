"use client";

import React from "react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Star, ShieldCheck } from "lucide-react";
import { Job, User } from "@/lib/types";
import { useUser } from "@/hooks/use-user";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export function RatingSection({ job, onJobUpdate }: { job: Job, onJobUpdate: (updatedJob: Partial<Job>) => void }) {
    const { user, role } = useUser();
    const [rating, setRating] = React.useState(0);
    const [hoverRating, setHoverRating] = React.useState(0);
    const [reviewText, setReviewText] = React.useState('');
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const { toast } = useToast();

    const jobGiverReview = (job as any).jobGiverReview;
    const installerReview = (job as any).installerReview;

    const isJobGiver = role === 'Job Giver';
    const myReview = isJobGiver ? jobGiverReview : installerReview;
    const theirReview = isJobGiver ? installerReview : jobGiverReview;
    const canSeeReviews = !!(jobGiverReview && installerReview);

    const handleRatingSubmit = async () => {
        if (!user) return;
        if (rating === 0) {
            toast({ title: "Please select a rating", variant: "destructive" });
            return;
        }
        setIsSubmitting(true);

        const reviewData = {
            rating,
            review: reviewText,
            createdAt: new Date(),
            authorId: user.id,
            authorName: user.name
        };

        const updatePayload: Partial<Job> = isJobGiver
            ? { jobGiverReview: reviewData, rating: rating, review: reviewText }
            : { installerReview: reviewData };

        await onJobUpdate(updatePayload);

        if (theirReview) {
            toast({ title: "Review Submitted", description: "Reviews are now unlocked!", variant: "success" as any });
        } else {
            toast({ title: "Review Submitted", description: "Your review is locked until the other party reviews you." });
        }
        setIsSubmitting(false);
    };

    if (myReview && canSeeReviews) {
        return (
            <div className="grid gap-6 md:grid-cols-2" data-testid="reviews-revealed-section">
                <Card className="border-green-200 bg-green-50/50">
                    <CardHeader><CardTitle>You Rated Them</CardTitle></CardHeader>
                    <CardContent>
                        <div className="flex text-yellow-500 mb-2">
                            {[...Array(5)].map((_, i) => <Star key={i} className={cn("h-5 w-5", i < myReview.rating ? "fill-current" : "text-gray-300")} />)}
                        </div>
                        <p className="italic">&quot;{myReview.review}&quot;</p>
                    </CardContent>
                </Card>
                <Card className="border-blue-200 bg-blue-50/50">
                    <CardHeader><CardTitle>They Rated You</CardTitle></CardHeader>
                    <CardContent>
                        <div className="flex text-yellow-500 mb-2">
                            {[...Array(5)].map((_, i) => <Star key={i} className={cn("h-5 w-5", i < theirReview.rating ? "fill-current" : "text-gray-300")} />)}
                        </div>
                        <p className="italic">&quot;{theirReview.review}&quot;</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (myReview && !canSeeReviews) {
        return (
            <Card className="bg-muted" data-testid="review-locked-card">
                <CardContent className="flex flex-col items-center justify-center p-8 text-center space-y-4">
                    <ShieldCheck className="h-12 w-12 text-muted-foreground" />
                    <h3 className="text-lg font-semibold">Review Submitted</h3>
                    <p className="text-muted-foreground max-w-sm">
                        Your review is secure. You will see their review once they rate you (Double-Blind Protection).
                    </p>
                    {theirReview && <Badge variant="secondary">They have submitted a review! (Hidden)</Badge>}
                </CardContent>
            </Card>
        );
    }

    // DEBUG: Log review state for CI diagnosis
    console.log('[RatingSection] Render:', {
        role,
        isJobGiver,
        hasJobGiverReview: !!jobGiverReview,
        hasInstallerReview: !!installerReview,
        theirReviewPresent: !!theirReview
    });

    return (
        <Card>
            <CardHeader>
                <CardTitle>Rate Your Experience</CardTitle>
                <CardDescription data-testid="rating-description">
                    {theirReview
                        ? <span data-testid="other-party-reviewed-text">The other party has already reviewed you! Submit yours to unlock and read it.</span>
                        : <span data-testid="double-blind-text">Reviews are double-blind. Neither party sees the review until both are submitted.</span>}
                </CardDescription>
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
                            data-testid={`rating-star-${star}`}
                        />
                    ))}
                </div>
                <Textarea
                    placeholder="Share honest feedback. It won't be visible until they review you..."
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    data-testid="rating-comment"
                />
            </CardContent>
            <CardFooter>
                <Button onClick={handleRatingSubmit} disabled={isSubmitting || rating === 0} data-testid="submit-review-button">
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Submit Sealed Review
                </Button>
            </CardFooter>
        </Card>
    );
}
