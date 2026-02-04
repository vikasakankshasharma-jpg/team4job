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
import { Loader2, ShieldCheck, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { approveJobAction } from "@/app/actions/job.actions";
import { Job, User } from "@/lib/types";

interface ReleasePaymentDialogProps {
    job: Job;
    user: User;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export function ReleasePaymentDialog({
    job,
    user,
    open,
    onOpenChange,
    onSuccess
}: ReleasePaymentDialogProps) {
    const [isLoading, setIsLoading] = React.useState(false);
    const { toast } = useToast();

    const handleRelease = async () => {
        setIsLoading(true);
        try {
            const res = await approveJobAction(job.id, user.id);
            if (res.success) {
                toast({
                    title: "Payment Released",
                    description: "Funds have been transferred to the installer."
                });
                onOpenChange(false);
                if (onSuccess) onSuccess();
            } else {
                throw new Error(res.error);
            }
        } catch (error: any) {
            console.error("Release Failed:", error);
            toast({
                title: "Release Failed",
                description: error.message || "Could not release payment.",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ShieldCheck className="text-green-600 h-5 w-5" />
                        Release Payment?
                    </DialogTitle>
                    <DialogDescription>
                        You are about to release funds from <strong>Secure Escrow</strong> to the installer.
                    </DialogDescription>
                </DialogHeader>

                <div className="bg-amber-50 border border-amber-200 rounded-md p-4 text-sm text-amber-800 space-y-2">
                    <p className="font-semibold">⚠️ Safety Check:</p>
                    <ul className="list-disc pl-5 space-y-1">
                        <li>Have you verified the work is completed?</li>
                        <li>Are you satisfied with the quality?</li>
                        <li>This action <strong>cannot be undone</strong>.</li>
                    </ul>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleRelease} disabled={isLoading} className="bg-green-600 hover:bg-green-700">
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Yes, Release Funds
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
