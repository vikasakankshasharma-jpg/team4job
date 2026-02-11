"use client";

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { MessageSquarePlus, Star, Loader2, Check } from "lucide-react";
import { useUser } from "@/hooks/use-user";
import { useToast } from "@/hooks/use-toast";
import { saveFeedbackAction } from "@/app/actions/feedback.actions";
import { cn } from "@/lib/utils";
import { BetaFeedback } from "@/lib/types";

export function BetaFeedbackButton() {
    const [open, setOpen] = useState(false);
    const [rating, setRating] = useState(0);
    const [category, setCategory] = useState<BetaFeedback['category'] | "">("");
    const [message, setMessage] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { user, role } = useUser();
    const { toast } = useToast();
    const t = useTranslations('feedback');

    const handleSubmit = async () => {
        if (!user) return;
        if (rating === 0) {
            toast({ title: t('incomplete'), description: t('incompleteRating'), variant: "destructive" });
            return;
        }
        if (!category) {
            toast({ title: t('incomplete'), description: t('incompleteCategory'), variant: "destructive" });
            return;
        }
        if (!message.trim()) {
            toast({ title: t('incomplete'), description: t('incompleteMessage'), variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await saveFeedbackAction(
                user.id,
                user.name,
                role || 'User',
                rating,
                category,
                message
            );

            if (result.success) {
                toast({
                    title: t('success'),
                    description: t('successDesc'),
                });
                setOpen(false);
                // Reset form
                setRating(0);
                setCategory("");
                setMessage("");
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            toast({
                title: t('error'),
                description: t('errorDesc'),
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!user) return null;

    return (
        <>
            <Button
                onClick={() => setOpen(true)}
                className="fixed bottom-20 sm:bottom-4 right-4 z-50 shadow-lg gap-2 rounded-full px-4 h-12 bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-300"
            >
                <MessageSquarePlus className="h-5 w-5" />
                <span className="hidden sm:inline">{t('button')}</span>
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>{t('title')}</DialogTitle>
                        <DialogDescription>
                            {t('description')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label>{t('experience')}</Label>
                            <div className="flex gap-2">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        type="button"
                                        onClick={() => setRating(star)}
                                        className="focus:outline-none transition-transform hover:scale-110"
                                    >
                                        <Star
                                            className={cn(
                                                "h-8 w-8 transition-colors",
                                                star <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"
                                            )}
                                        />
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>{t('category')}</Label>
                            <Select value={category} onValueChange={(val: any) => setCategory(val)}>
                                <SelectTrigger>
                                    <SelectValue placeholder={t('selectCategory')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Bug Report">{t('catBug')}</SelectItem>
                                    <SelectItem value="Feature Request">{t('catFeature')}</SelectItem>
                                    <SelectItem value="Improvement">{t('catImprovement')}</SelectItem>
                                    <SelectItem value="Other">{t('catOther')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>{t('details')}</Label>
                            <Textarea
                                placeholder={t('detailsPlaceholder')}
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                className="min-h-[100px]"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="w-full sm:w-auto"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    {t('sending')}
                                </>
                            ) : (
                                <>
                                    {t('send')}
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
