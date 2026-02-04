import React from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldAlert, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { raiseDisputeAction } from "@/app/actions/job.actions";
import { Job, User } from "@/lib/types";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DisputeDialogProps {
    job: Job;
    user: User;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

const DISPUTE_REASONS = [
    "Work Not Completed",
    "Poor Quality Work",
    "Installer Didn't Show Up",
    "Payment Issue",
    "Harassment / Safety",
    "Other"
];

export function DisputeDialog({
    job,
    user,
    open,
    onOpenChange,
    onSuccess
}: DisputeDialogProps) {
    const [isLoading, setIsLoading] = React.useState(false);
    const [reason, setReason] = React.useState("");
    const [description, setDescription] = React.useState("");
    const { toast } = useToast();

    const handleDispute = async () => {
        if (!reason || !description) {
            toast({ title: "Incomplete", description: "Please provide a reason and description.", variant: "destructive" });
            return;
        }

        setIsLoading(true);
        try {
            const res = await raiseDisputeAction(job.id, user.id, reason, description);
            if (res.success) {
                toast({
                    title: "Dispute Raised",
                    description: "Our support team has been notified. Funds are frozen."
                });
                onOpenChange(false);
                if (onSuccess) onSuccess();
            } else {
                throw new Error(res.error);
            }
        } catch (error: any) {
            console.error("Dispute Failed:", error);
            toast({
                title: "Failed",
                description: error.message || "Could not raise dispute.",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-destructive">
                        <ShieldAlert className="h-5 w-5" />
                        Report Issue / Raise Dispute
                    </DialogTitle>
                    <DialogDescription>
                        Raising a dispute will <strong>freeze the job status and funds</strong> immediately. Admin intervention is required to resolve this.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div className="space-y-2">
                        <Label>Reason *</Label>
                        <Select onValueChange={setReason} value={reason}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select reason..." />
                            </SelectTrigger>
                            <SelectContent>
                                {DISPUTE_REASONS.map(r => (
                                    <SelectItem key={r} value={r}>{r}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Description *</Label>
                        <Textarea
                            placeholder="Please explain the issue in detail. Include dates and events."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={4}
                        />
                    </div>

                    <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-800 flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                        <div>
                            <p className="font-semibold">What happens next?</p>
                            <ul className="list-disc pl-4 space-y-1 text-xs mt-1">
                                <li>The Support Team will review chat logs and files.</li>
                                <li>You may be contacted for more evidence.</li>
                                <li>A decision will be made within 24-48 hours.</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleDispute} disabled={isLoading} variant="destructive">
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Submit Dispute
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
