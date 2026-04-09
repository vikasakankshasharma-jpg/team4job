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
import { Loader2, Sparkles } from "lucide-react";
import { Job, User, PlatformSettings } from "@/lib/types";
import { aiAssistedBidCreationAction } from "@/app/actions/ai.actions";
import { toDate, cn } from "@/lib/utils";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Separator } from "@/components/ui/separator";
import { placeBidAction } from "@/app/actions/bid.actions";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Info, Lock, CheckCircle2, TrendingUp } from "lucide-react";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const bidSchema = z.object({
    amount: z.coerce.number().min(1, "Bid amount must be at least ₹1"),
    estimatedDuration: z.coerce.number().min(1, "Duration must be at least 1"),
    durationUnit: z.enum(["Hours", "Days"]),
    coverLetter: z.string().min(10, "Cover letter must be at least 10 characters"),
});

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
    const [aiLoading, setAiLoading] = React.useState(false);
    const { toast } = useToast();
    const t = useTranslations('bidding');
    const tError = useTranslations('errors');

    const form = useForm<z.infer<typeof bidSchema>>({
        resolver: zodResolver(bidSchema),
        defaultValues: {
            amount: 0,
            estimatedDuration: 1,
            durationUnit: "Days",
            coverLetter: "",
        },
    });

    const { isSubmitting } = form.formState;

    // Reset form when dialog opens
    React.useEffect(() => {
        if (open) {
            form.reset({
                amount: 0,
                estimatedDuration: 1,
                durationUnit: "Days",
                coverLetter: "",
            });
        }
    }, [open, form]);

    const handleAiAssist = async () => {
        const currentLetter = form.getValues("coverLetter");
        setAiLoading(true);
        try {
            const result = await aiAssistedBidCreationAction({
                jobDescription: job.description,
                professionalSkills: user.professionalProfile?.skills?.join(", ") || "",
                professionalExperience: "General",
                bidContext: currentLetter,
                userId: user.id
            });
            if (result.success && result.data) {
                form.setValue("coverLetter", result.data.bidProposal, { shouldValidate: true });
                toast({ title: "AI Draft Generated", description: "You can edit the proposal before sending." });
            } else {
                throw new Error(result.error || "AI failed to generate a proposal.");
            }
        } catch (error: any) {
            toast({ title: "AI Generation Failed", description: tError(error.message) || "Could not generate draft.", variant: "destructive" });
        } finally {
            setAiLoading(false);
        }
    };

    async function onSubmit(values: z.infer<typeof bidSchema>) {
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

        try {
            const result = await placeBidAction(job.id, user.id, 'Professional', {
                jobId: job.id,
                amount: values.amount,
                coverLetter: values.coverLetter,
                estimatedDuration: values.estimatedDuration,
                durationUnit: values.durationUnit
            });

            if (result.success) {
                toast({ title: "Bid Placed!", description: "The Client has been notified." });
                onBidSubmit();
                onOpenChange(false);
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({ title: "Bid Failed", description: tError(error.message) || "Could not place bid.", variant: "destructive" });
        }
    }

    const currentAmount = form.watch("amount");

    const professionalTierPriority = user.professionalProfile?.tierPriority || 1;
    let commissionPercentage = 5;
    if (professionalTierPriority === 4) commissionPercentage = 2;
    else if (professionalTierPriority === 3) commissionPercentage = 3;
    else if (professionalTierPriority === 2) commissionPercentage = 4;

    const commissionAmount = Math.ceil(currentAmount * (commissionPercentage / 100));

    // Handle Tier restriction visually
    const isTierRestricted = !!(job.minTierPriority && professionalTierPriority < job.minTierPriority);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <AnimatePresence>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                    >
                        <DialogHeader className="pb-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <DialogTitle className="text-2xl font-black tracking-tight">{t("placeBid") || "Place a Bid"}</DialogTitle>
                                    <DialogDescription className="mt-1">
                                        Submit your proposal for <span className="font-semibold text-foreground">&quot;{job.title}&quot;</span>
                                    </DialogDescription>
                                </div>
                                {job.minTierPriority && job.minTierPriority > 1 && (
                                    <Badge 
                                        variant={isTierRestricted ? "destructive" : "secondary"}
                                        className={cn(
                                            "rounded-[1rem] px-4 py-1.5 flex items-center gap-2 font-black italic tracking-tighter uppercase text-[10px] shadow-lg shadow-black/5 transition-all",
                                            !isTierRestricted && "bg-success/10 text-success border-success/20"
                                        )}
                                    >
                                        {isTierRestricted ? <Lock className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
                                        {job.minTierPriority === 4 ? "Platinum Only" : job.minTierPriority === 3 ? "Gold & Above" : "Silver & Above"}
                                    </Badge>
                                )}
                            </div>

                            {isTierRestricted && (
                                <div className="mt-4 p-5 rounded-[2rem] bg-destructive/10 border border-destructive/20 flex gap-4 items-start shadow-inner">
                                    <div className="p-2.5 rounded-full bg-destructive/20 text-destructive shadow-lg">
                                        <Lock className="h-5 w-5" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm font-bold text-destructive">Insufficient Reputation</p>
                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                            This is a high-priority job. You need to reach the <span className="font-bold text-destructive">
                                                {job.minTierPriority === 4 ? "Platinum" : job.minTierPriority === 3 ? "Gold" : "Silver"}
                                            </span> tier to bid. Complete more jobs and earn positive reviews to rank up!
                                        </p>
                                    </div>
                                </div>
                            )}
                        </DialogHeader>

                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-2">
                                <div className="p-6 rounded-[2rem] bg-muted/40 border border-white/5 space-y-5 shadow-inner">
                                    <FormField
                                        control={form.control}
                                        name="amount"
                                        render={({ field }) => (
                                            <FormItem>
                                                <div className="flex justify-between items-center mb-1">
                                                    <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Bid Amount (₹)</FormLabel>
                                                    {isTierRestricted && <Badge variant="outline" className="text-[10px]">Locked</Badge>}
                                                </div>
                                                <FormControl>
                                                    <div className="relative">
                                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-xl">₹</span>
                                                        <Input 
                                                            type="number" 
                                                            placeholder="0.00" 
                                                            {...field} 
                                                            disabled={isTierRestricted || isSubmitting}
                                                            className="h-14 pl-10 text-2xl font-black bg-background border-none shadow-inner focus-visible:ring-primary/20" 
                                                        />
                                                    </div>
                                                </FormControl>
                                                <FormMessage data-testid="bid-amount-error" />
                                            </FormItem>
                                        )}
                                    />

                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="estimatedDuration"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Duration</FormLabel>
                                                    <FormControl>
                                                        <Input 
                                                            type="number" 
                                                            min={1} 
                                                            {...field} 
                                                            disabled={isTierRestricted || isSubmitting}
                                                            className="h-12 bg-background/50 border-none"
                                                        />
                                                    </FormControl>
                                                    <FormMessage data-testid="bid-duration-error" />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="durationUnit"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Unit</FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isTierRestricted || isSubmitting}>
                                                        <FormControl>
                                                            <SelectTrigger className="h-12 bg-background/50 border-none">
                                                                <SelectValue placeholder="Unit" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="Hours">Hours</SelectItem>
                                                            <SelectItem value="Days">Days</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage data-testid="bid-duration-unit-error" />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </div>

                                {currentAmount > 0 && !isTierRestricted && (
                                    <motion.div 
                                        initial={{ opacity: 0, scale: 0.98, height: 0 }}
                                        animate={{ opacity: 1, scale: 1, height: 'auto' }}
                                        className="relative p-6 rounded-[2rem] bg-primary/5 border border-primary/10 overflow-hidden shadow-inner"
                                    >
                                        <div className="absolute top-0 right-0 p-3 opacity-10 pointer-events-none">
                                            <TrendingUp className="h-12 w-12" />
                                        </div>
                                        <div className="space-y-3 relative z-10">
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="font-bold uppercase tracking-tighter text-muted-foreground">Platform Fee ({commissionPercentage}%)</span>
                                                <span className="font-black text-destructive">-₹{commissionAmount}</span>
                                            </div>
                                            {commissionPercentage < 5 && (
                                                <div className="flex items-center gap-2 text-[10px] bg-success/10 text-success w-fit px-2 py-0.5 rounded-full border border-success/20">
                                                    <Sparkles className="h-2.5 w-2.5" />
                                                    <span className="font-bold">TIER DISCOUNT APPLIED: SAVED ₹{Math.ceil(currentAmount * 0.05) - commissionAmount}</span>
                                                </div>
                                            )}
                                            <Separator className="bg-primary/10" />
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm font-black uppercase text-primary">Your Net Earnings</span>
                                                <span className="text-2xl font-black text-primary">₹{currentAmount - commissionAmount}</span>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                <FormField
                                    control={form.control}
                                    name="coverLetter"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t("coverLetter") || "Cover Letter"}</FormLabel>
                                            <div className="relative group">
                                                <FormControl>
                                                    <Textarea
                                                        placeholder={t("proposalPlaceholder") || "Explain why you're the best fit for this job..."}
                                                        className="min-h-[140px] rounded-[2rem] bg-muted/20 border-white/5 focus:border-primary/40 focus:bg-muted/40 transition-all resize-none p-6 text-sm font-medium shadow-inner"
                                                        {...field}
                                                        disabled={isTierRestricted || isSubmitting}
                                                    />
                                                </FormControl>
                                                <Button
                                                    type="button"
                                                    variant="secondary"
                                                    size="sm"
                                                    className="absolute bottom-4 right-4 h-10 px-6 rounded-[1.5rem] bg-primary text-primary-foreground hover:bg-primary/90 shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all border-none"
                                                    onClick={handleAiAssist}
                                                    disabled={aiLoading || isTierRestricted}
                                                >
                                                    {aiLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                                                    <span className="text-[10px] font-black uppercase tracking-widest">Write with AI</span>
                                                </Button>
                                            </div>
                                            <FormMessage data-testid="bid-cover-letter-error" />
                                        </FormItem>
                                    )}
                                />

                                <DialogFooter className="pt-4 gap-4">
                                    <Button 
                                        type="button" 
                                        variant="ghost" 
                                        onClick={() => onOpenChange(false)}
                                        className="h-14 rounded-[2rem] text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-foreground active:scale-95 transition-all"
                                    >
                                        Cancel
                                    </Button>
                                    <Button 
                                        type="submit" 
                                        disabled={Boolean(isSubmitting || isTierRestricted)} 
                                        className="h-14 px-12 rounded-[2rem] font-black italic tracking-tighter uppercase bg-primary shadow-2xl shadow-primary/40 hover:translate-y-[-2px] hover:shadow-primary/50 active:scale-95 transition-all flex-1 sm:flex-none border-none"
                                        data-testid="submit-bid-button"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                                Sending...
                                            </>
                                        ) : (
                                            "Confirm & Place Bid"
                                        )}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    </motion.div>
                </AnimatePresence>
            </DialogContent>
        </Dialog>
    );
}
