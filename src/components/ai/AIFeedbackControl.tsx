'use client';

import { useState } from 'react';
import { ThumbsUp, ThumbsDown, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { submitAIFeedback } from '@/app/actions/ai-feedback.actions';
import { useUser } from '@/hooks/use-user';
import { toast } from '@/hooks/use-toast';

interface AIFeedbackControlProps {
    flowName: string;
    traceId?: string;
    metadata?: Record<string, any>;
    className?: string;
}

export function AIFeedbackControl({ flowName, traceId, metadata, className }: AIFeedbackControlProps) {
    const { user } = useUser(); // Ensure user is logged in, or handle anonymously
    const [rating, setRating] = useState<'positive' | 'negative' | null>(null);
    const [reason, setReason] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleRating = async (selectedRating: 'positive' | 'negative') => {
        setRating(selectedRating);

        // Optimistic feedback: immediately record simple rating
        try {
            await submitAIFeedback({
                flowName,
                traceId,
                userId: user?.id || 'anonymous',
                rating: selectedRating,
                metadata
            });
            toast({ title: "Thanks for your feedback!" });

            // If negative, encourage detailed feedback
            if (selectedRating === 'negative') {
                setIsOpen(true);
            }
        } catch (error) {
            toast({ title: "Failed to submit feedback.", variant: "destructive" });
        }
    };

    const handleSubmitReason = async () => {
        if (!rating) return;
        setIsSubmitting(true);
        try {
            // Re-submit with reason (overwriting or appending logic in backend ideally, but creating new doc is fine for now if traceId links them, or update existing)
            // For simplicity MVP: Just submit a second entries or update? 
            // Firestore 'add' creates new doc. A better way in v2 is to pass an ID or update previous doc.
            // Let's just submit a new detailed feedback entry for now. Analytics can dedupe by traceId.
            await submitAIFeedback({
                flowName,
                traceId,
                userId: user?.id || 'anonymous',
                rating,
                reason,
                metadata
            });
            setIsOpen(false);
            toast({ title: "Detailed feedback received." });
        } catch (error) {
            toast({ title: "Failed to submit details.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (rating === 'positive') {
        return (
            <div className={`flex items-center gap-2 text-sm text-muted-foreground ${className}`}>
                <Check className="h-4 w-4 text-green-500" />
                <span>Helpful</span>
            </div>
        );
    }

    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <span className="text-xs text-muted-foreground mr-2">Was this helpful?</span>

            <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:text-green-600"
                onClick={() => handleRating('positive')}
            >
                <ThumbsUp className="h-4 w-4" />
            </Button>

            <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:text-red-600"
                        onClick={() => handleRating('negative')}
                    >
                        <ThumbsDown className="h-4 w-4" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                    <div className="grid gap-4">
                        <div className="space-y-2">
                            <h4 className="font-medium leading-none">How can we improve?</h4>
                            <p className="text-sm text-muted-foreground">
                                Tell us what went wrong with this response.
                            </p>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="reason">Reason</Label>
                            <Textarea
                                id="reason"
                                placeholder="It was inaccurate / too long / irrelevant..."
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                            />
                        </div>
                        <Button size="sm" onClick={handleSubmitReason} disabled={isSubmitting}>
                            {isSubmitting ? 'Sending...' : 'Submit Feedback'}
                        </Button>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
}
