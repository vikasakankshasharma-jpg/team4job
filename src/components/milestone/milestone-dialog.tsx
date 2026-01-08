
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface MilestoneDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (title: string, description: string, amount: number) => Promise<void>;
    maxAmount: number;
}

export function MilestoneDialog({ open, onOpenChange, onSubmit, maxAmount }: MilestoneDialogProps) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async () => {
        if (!title || !amount) return;

        setIsLoading(true);
        try {
            await onSubmit(title, description, Number(amount));
            onOpenChange(false);
            // Reset form
            setTitle('');
            setDescription('');
            setAmount('');
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add Milestone</DialogTitle>
                    <DialogDescription>
                        Break down the job into paid milestones. Total remaining budget: ₹{maxAmount.toLocaleString()}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="title">Milestone Title</Label>
                        <Input
                            id="title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g., First Fix / Wiring"
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="amount">Amount (₹)</Label>
                        <Input
                            id="amount"
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            max={maxAmount}
                            placeholder="0.00"
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="description">Description (Optional)</Label>
                        <Textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Describe the deliverables..."
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={isLoading || !title || !amount || Number(amount) > maxAmount}>
                        {isLoading ? "Creating..." : "Add Milestone"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
