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
import { 
    Star, 
    ShieldCheck, 
    Loader2, 
    Sparkles, 
    Award, 
    ShieldAlert, 
    Zap 
} from "lucide-react";
import { Job, User } from "@/lib/types";
import { useTranslations } from 'next-intl';
import { submitReviewAction } from "@/app/actions/review.actions";
import { motion, AnimatePresence } from "framer-motion";
import { useUser } from "@/hooks/use-user";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export function RatingSection({ job, onJobUpdate }: { job: Job, onJobUpdate?: (updatedJob: Partial<Job>) => void }) {
    const { user, role } = useUser();
    const t = useTranslations('reviews');
    const tCommon = useTranslations('common');
    const [rating, setRating] = React.useState(0);
    const [hoverRating, setHoverRating] = React.useState(0);
    const [reviewText, setReviewText] = React.useState('');
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const { toast } = useToast();

    const clientReview = (job as any).clientReview;
    const ProfessionalReview = (job as any).professionalReview;

    const isclient = role === 'Client';
    const myReview = isclient ? clientReview : ProfessionalReview;
    const theirReview = isclient ? ProfessionalReview : clientReview;
    const canSeeReviews = !!(clientReview && ProfessionalReview);

    const handleRatingSubmit = async () => {
        if (!user || !job) return;
        if (rating === 0) {
            toast({ title: t('selectRatingError'), variant: "destructive" });
            return;
        }
        setIsSubmitting(true);

        try {
            const targetUserId = isclient 
                ? (job.awardedProfessionalId || (typeof job.awardedProfessional === 'string' ? job.awardedProfessional : job.awardedProfessional?.id))
                : (job.clientId || (typeof job.client === 'string' ? job.client : job.client?.id));

            if (!targetUserId) throw new Error("Could not determine target user for review");

            const res = await submitReviewAction({
                jobId: job.id,
                reviewerId: user.id,
                targetUserId,
                rating,
                comment: reviewText,
                role: role as 'Client' | 'Professional',
                reviewerName: user.name
            });

            if (res.success) {
                if (theirReview) {
                    toast({ 
                        title: "Trust Protocol Unlocked!", 
                        description: "Both professional reviews are now visible. Production cycle complete.",
                        className: "bg-success text-white border-none rounded-3xl"
                    });
                } else {
                    toast({ 
                        title: "Review Sealed & Secured", 
                        description: "Your assessment is encrypted and hidden until the other party submits.",
                        className: "bg-primary text-white border-none rounded-3xl"
                    });
                }
                
                // Optimistically update the UI to show the locked card
                if (onJobUpdate) {
                    const updateField = isclient ? 'clientReview' : 'professionalReview';
                    onJobUpdate({
                        [updateField]: {
                            rating,
                            review: reviewText,
                            authorId: user.id,
                            authorName: user.name,
                            createdAt: new Date()
                        }
                    } as Partial<Job>);
                }
            } else {
                throw new Error(res.error);
            }
        } catch (error: any) {
            toast({ title: tCommon('error'), description: error.message, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (myReview && canSeeReviews) {
        return (
            <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid gap-8 md:grid-cols-2 mt-12 mb-12" 
                data-testid="reviews-revealed-section"
            >
                <div className="absolute inset-0 bg-gradient-to-br from-success/5 via-primary/5 to-accent/5 blur-3xl opacity-30 -z-10" />
                
                <Card className="border-none bg-surface-container-low/40 dark:bg-slate-900/60 backdrop-blur-3xl rounded-[3.5rem] shadow-[0_45px_120px_rgba(0,0,0,0.3)] overflow-hidden relative group ring-1 ring-white/10">
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-success/40 to-transparent shadow-[0_0_20px_rgba(var(--success),0.3)]" />
                    <CardHeader className="p-10 pb-4">
                        <div className="flex items-center gap-6 mb-2">
                            <div className="h-14 w-14 rounded-[1.5rem] bg-success/10 text-success flex items-center justify-center shadow-inner border border-success/10 group-hover:scale-110 transition-transform">
                                <Award className="h-7 w-7" />
                            </div>
                            <CardTitle className="text-2xl font-black tracking-tighter italic uppercase opacity-60">
                                 Self Assessment
                             </CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="p-10 pt-0">
                        <div className="flex text-amber-400 mb-6 gap-1 group-hover:scale-110 transition-transform origin-left duration-500">
                            {[...Array(5)].map((_, i) => (
                                <Star key={i} className={cn("h-6 w-6", i < myReview.rating ? "fill-current drop-shadow-[0_0_8px_rgba(251,191,36,0.3)]" : "text-muted/20")} />
                            ))}
                        </div>
                        <p className="text-xl font-medium leading-relaxed italic opacity-90 tracking-tight">&quot;{myReview.review || "No comment provided."}&quot;</p>
                    </CardContent>
                </Card>

                <Card className="border-none bg-surface-container-low/40 dark:bg-slate-900/60 backdrop-blur-3xl rounded-[3.5rem] shadow-[0_45px_120px_rgba(0,0,0,0.3)] overflow-hidden relative group ring-1 ring-white/10">
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary/40 to-transparent shadow-[0_0_20px_rgba(var(--primary),0.3)]" />
                    <CardHeader className="p-10 pb-4">
                        <div className="flex items-center gap-6 mb-2">
                            <div className="h-14 w-14 rounded-[1.5rem] bg-primary/10 text-primary flex items-center justify-center shadow-inner border border-primary/10 group-hover:scale-110 transition-transform">
                                <Sparkles className="h-7 w-7" />
                            </div>
                            <CardTitle className="text-2xl font-black tracking-tighter italic uppercase opacity-60">
                                 Counterparty Feedback
                             </CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="p-10 pt-0">
                        <div className="flex text-amber-400 mb-6 gap-1 group-hover:scale-110 transition-transform origin-left duration-500">
                            {[...Array(5)].map((_, i) => (
                                <Star key={i} className={cn("h-6 w-6", i < theirReview.rating ? "fill-current drop-shadow-[0_0_8px_rgba(251,191,36,0.3)]" : "text-muted/20")} />
                            ))}
                        </div>
                        <p className="text-xl font-medium leading-relaxed italic opacity-90 tracking-tight">&quot;{theirReview.review || "No comment provided."}&quot;</p>
                    </CardContent>
                </Card>
            </motion.div>
        );
    }

    if (myReview && !canSeeReviews) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-12"
            >
                <Card className="border-none bg-surface-container-low/40 dark:bg-slate-900/60 backdrop-blur-3xl rounded-[3.5rem] shadow-[0_45px_120px_rgba(0,0,0,0.3)] overflow-hidden ring-1 ring-white/10" data-testid="review-locked-card">
                    <div className="h-2 w-full bg-gradient-to-r from-primary via-accent to-primary animate-gradient-x opacity-30" />
                    <CardContent className="flex flex-col items-center justify-center p-20 text-center space-y-10">
                        <div className="relative">
                            <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-pulse" />
                            <div className="relative bg-primary/10 p-12 rounded-[3rem] shadow-inner text-primary border border-white/5">
                                <ShieldCheck className="h-24 w-24" />
                            </div>
                        </div>
                        <div className="space-y-4">
                            <h3 className="text-4xl sm:text-6xl font-black italic tracking-tighter uppercase leading-none">Trust Protocol Engaged</h3>
                            <p className="text-muted-foreground max-w-sm text-lg font-medium italic opacity-60 leading-relaxed mx-auto">
                                Cryptographic review securement active. Transparency window opens upon mutual submission.
                            </p>
                        </div>
                        <AnimatePresence>
                            {theirReview && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                >
                                    <Badge variant="secondary" className="px-8 py-4 rounded-[1.25rem] bg-success/10 text-success border border-white/5 font-black text-[11px] uppercase tracking-[0.4em] shadow-2xl italic">
                                        <Zap className="h-4 w-4 mr-3 fill-current animate-pulse" />
                                        COUNTERPARTY SUBMISSION DETECTED
                                    </Badge>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </CardContent>
                </Card>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-12"
        >
            <Card className="border-none bg-surface-container-low/40 dark:bg-slate-900/60 backdrop-blur-3xl rounded-[3.5rem] shadow-[0_45px_120px_rgba(0,0,0,0.3)] overflow-hidden relative ring-1 ring-white/10">
                <div className="absolute inset-0 bg-gradient-to-br from-warning/10 via-transparent to-primary/5 -z-10" />
                <div className="h-2 w-full bg-gradient-to-r from-warning via-primary to-warning animate-gradient-x opacity-30" />
                
                <CardHeader className="p-12 pb-8">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-10">
                        <CardTitle className="text-6xl sm:text-7xl md:text-8xl font-black italic tracking-tighter uppercase bg-gradient-to-br from-foreground to-foreground/50 bg-clip-text text-transparent leading-[0.85]">
                            Performance Review
                        </CardTitle>
                        <Badge variant="outline" className="px-8 py-3 rounded-[1.25rem] border-white/5 text-[11px] font-black uppercase tracking-[0.4em] opacity-40 italic">
                            {theirReview
                                ? <span data-testid="other-party-reviewed-text" className="text-success">COUNTERPARTY COMPLETED</span>
                                : <span data-testid="double-blind-text">Double-Blind Protocol</span>}
                        </Badge>
                    </div>
                </CardHeader>

                <CardContent className="p-12 pt-4 space-y-12">
                    <div className="flex flex-wrap justify-center items-center gap-6 sm:gap-10 py-4">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <motion.div
                                key={star}
                                whileHover={{ scale: 1.3, rotate: 12 }}
                                whileTap={{ scale: 0.85 }}
                                className="relative"
                            >
                                <Star
                                    className={cn(
                                        "h-16 w-16 cursor-pointer transition-all duration-300",
                                        (hoverRating >= star || rating >= star)
                                            ? "text-amber-400 fill-amber-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.5)]"
                                            : "text-slate-200"
                                    )}
                                    onMouseEnter={() => setHoverRating(star)}
                                    onMouseLeave={() => setHoverRating(0)}
                                    onClick={() => setRating(star)}
                                    data-testid={`rating-star-${star}`}
                                />
                                {(hoverRating >= star || rating >= star) && (
                                    <motion.div
                                        layoutId="star-aura"
                                        className="absolute -inset-4 bg-amber-400/10 blur-xl rounded-full -z-10"
                                    />
                                )}
                            </motion.div>
                        ))}
                    </div>

                    <div className="relative group/review">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent blur-3xl opacity-0 group-focus-within/review:opacity-100 transition-opacity" />
                            <Textarea
                                placeholder="Detail your assessment of the mission performance..."
                                className="min-h-[220px] rounded-[3rem] border-none bg-muted/20 p-10 text-xl font-medium resize-none focus-visible:ring-4 focus-visible:ring-primary/10 transition-all placeholder:opacity-20 shadow-inner relative z-10 italic leading-relaxed"
                            value={reviewText}
                            onChange={(e) => setReviewText(e.target.value)}
                            data-testid="rating-comment"
                        />
                    </div>
                </CardContent>

                <CardFooter className="p-12 pt-0">
                    <Button 
                       onClick={handleRatingSubmit} 
                       disabled={isSubmitting || rating === 0} 
                       className="w-full h-24 rounded-[3.5rem] bg-primary text-primary-foreground font-black text-xs uppercase tracking-[0.4em] shadow-[0_30px_70px_rgba(var(--primary),0.3)] hover:shadow-[0_40px_90px_rgba(var(--primary),0.5)] hover:-translate-y-1 active:scale-95 transition-all relative overflow-hidden group italic"
                       data-testid="submit-review-button"
                    >
                        <span className="relative z-10 flex items-center justify-center gap-4">
                            {isSubmitting ? (
                                <Loader2 className="h-7 w-7 animate-spin" />
                            ) : (
                                <>
                                    Seal & Secure Assessment
                                </>
                            )}
                        </span>
                        <div className="absolute inset-0 bg-background/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                    </Button>
                </CardFooter>
            </Card>
        </motion.div>
    );
}
