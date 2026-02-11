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
import { toDate } from "@/lib/utils";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Separator } from "@/components/ui/separator";
import { placeBidAction } from "@/app/actions/bid.actions";

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
                installerSkills: user.installerProfile?.skills?.join(", ") || "",
                installerExperience: "General",
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
            console.error(error);
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
            const result = await placeBidAction(job.id, user.id, 'Installer', {
                jobId: job.id,
                amount: values.amount,
                coverLetter: values.coverLetter,
                estimatedDuration: values.estimatedDuration,
                durationUnit: values.durationUnit
            });

            if (result.success) {
                toast({ title: "Bid Placed!", description: "The Job Giver has been notified." });
                onBidSubmit();
                onOpenChange(false);
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            console.error("Bid submission failed:", error);
            toast({ title: "Bid Failed", description: tError(error.message) || "Could not place bid.", variant: "destructive" });
        }
    }

    const currentAmount = form.watch("amount");

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Place a Bid</DialogTitle>
                    <DialogDescription>Submit your offer for &quot;{job.title}&quot;.</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                        <FormField
                            control={form.control}
                            name="amount"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Bid Amount (₹)</FormLabel>
                                    <FormControl>
                                        <Input type="number" placeholder="e.g. 5000" {...field} className="text-lg" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="estimatedDuration"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Estimated Duration</FormLabel>
                                        <FormControl>
                                            <Input type="number" min={1} {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="durationUnit"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Unit</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Unit" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="Hours">Hours</SelectItem>
                                                <SelectItem value="Days">Days</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {currentAmount > 0 && (
                            <div className="rounded-md bg-muted p-3 text-sm" role="status" aria-live="polite">
                                <div className="flex justify-between text-muted-foreground">
                                    <span>Platform Commission (5%):</span>
                                    <span>-₹{Math.ceil(currentAmount * 0.05)}</span>
                                </div>
                                <Separator className="my-1" />
                                <div className="flex justify-between font-medium text-foreground">
                                    <span>You Receive (Net):</span>
                                    <span className="text-green-600">₹{currentAmount - Math.ceil(currentAmount * 0.05)}</span>
                                </div>
                                <p className="mt-2 text-xs text-muted-foreground">
                                    * Payout is processed upon job completion.
                                </p>
                            </div>
                        )}

                        <FormField
                            control={form.control}
                            name="coverLetter"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Cover Letter</FormLabel>
                                    <div className="relative">
                                        <FormControl>
                                            <Textarea
                                                placeholder="I have the right tools and 5 years experience..."
                                                className="min-h-[100px]"
                                                {...field}
                                            />
                                        </FormControl>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="absolute bottom-2 right-2 h-6 text-xs text-purple-600 hover:bg-purple-50"
                                            onClick={handleAiAssist}
                                            disabled={aiLoading}
                                            aria-label="Generate AI Draft for Cover Letter"
                                        >
                                            {aiLoading ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Sparkles className="mr-1 h-3 w-3" />}
                                            AI Draft
                                        </Button>
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                            <Button type="submit" disabled={isSubmitting} data-testid="submit-bid-button">
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Place Bid
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
