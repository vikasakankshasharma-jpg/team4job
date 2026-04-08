"use client";

import React from "react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2, Ban } from "lucide-react";
import { Job, User } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { getAuth } from "firebase/auth";
import axios from "axios";

export function CancelJobDialog({
    job,
    user,
    onJobUpdate,
    open,
    onOpenChange
}: {
    job: Job,
    user: User,
    onJobUpdate: (updatedJob: Partial<Job>) => void,
    open: boolean,
    onOpenChange: (open: boolean) => void
}) {
    const [isLoading, setIsLoading] = React.useState(false);
    const { toast } = useToast();
    const [reason, setReason] = React.useState("changed_mind");
    const isNoShow = reason === 'no_show';

    const handleCancel = async () => {
        setIsLoading(true);
        try {
            await axios.post('/api/escrow/refund', {
                jobId: job.id,
                userId: user.id
            }, {
                headers: { Authorization: `Bearer ${await getAuth().currentUser?.getIdToken()}` }
            });

            onJobUpdate({ status: 'Cancelled' });

            toast({
                title: "Job Cancelled",
                description: "Refund has been processed.",
                variant: 'destructive' as any
            });
            onOpenChange(false);
        } catch (error: any) {
            toast({
                title: "Cancellation Failed",
                description: error.response?.data?.error || "Could not cancel job.",
                variant: 'destructive'
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Cancel Job & Refund?</AlertDialogTitle>
                    <div className="space-y-4 py-2">
                        <Label>Reason for Cancellation</Label>
                        <Select value={reason} onValueChange={setReason}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="changed_mind">Changed my mind / Found another way</SelectItem>
                                <SelectItem value="mistake">Posted by mistake</SelectItem>
                                <SelectItem value="no_show">Professional No-Show / Unresponsive</SelectItem>
                            </SelectContent>
                        </Select>

                        {isNoShow ? (
                            <div className="bg-warning/10 p-5 rounded-[2rem] border border-warning/20 text-warning text-sm shadow-inner backdrop-blur-md">
                                <span className="font-black italic uppercase tracking-widest block mb-2 text-[10px]">Fee Waiver Available // Protocol Notice</span>
                                <span className="opacity-70 font-medium italic">To avoid the 2.5% cancellation fee for a No-Show, please raise a dispute instead of cancelling. The admin will verify and issue a full refund.</span>
                            </div>
                        ) : (
                            <div className="bg-destructive/10 p-5 rounded-[2rem] border border-destructive/20 text-destructive text-sm shadow-inner backdrop-blur-md">
                                <span className="font-black italic uppercase tracking-widest block mb-2 text-[10px]">Cancellation Fee Applies // Financial Logic</span>
                                <span className="opacity-70 font-medium italic">A 2.5% platform fee will be deducted from your refund.</span>
                            </div>
                        )}
                    </div>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Keep Job</AlertDialogCancel>
                    {isNoShow ? (
                        <Button
                            variant="destructive"
                            onClick={() => {
                                onOpenChange(false);
                                toast({
                                    title: "Raise a Dispute",
                                    description: "Please use the 'Raise a Dispute' button in the Actions panel to claim a full refund.",
                                    variant: "default"
                                });
                            }}
                        >
                            Raise Dispute (Full Refund)
                        </Button>
                    ) : (
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                handleCancel();
                            }}
                            className="bg-red-600 hover:bg-red-700 text-white"
                            disabled={isLoading}
                        >
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Ban className="mr-2 h-4 w-4" />}
                            Confirm Cancellation
                        </AlertDialogAction>
                    )}
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
