"use client";

import React from "react";
import {
    Card,
    CardDescription,
    CardHeader,
    CardTitle,
    CardFooter,
} from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2, RefreshCcw, Hourglass } from "lucide-react";
import { Job, User } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { arrayRemove } from "firebase/firestore";
import axios from "axios";

export function ReapplyCard({ job, user, onJobUpdate }: { job: Job, user: User, onJobUpdate: (updatedJob: Partial<Job>) => void }) {
    const [isLoading, setIsLoading] = React.useState(false);
    const { toast } = useToast();

    const handleReapply = async () => {
        setIsLoading(true);
        try {
            await axios.post('/api/reputation/deduct', {
                userId: user.id,
                points: 15,
                reason: `Re-application for Job ${job.id}`,
                jobId: job.id
            });

            await onJobUpdate({ disqualifiedInstallerIds: arrayRemove(user.id) as any });

            toast({
                title: "Re-application Request Sent",
                description: "15 points deducted. You are now eligible to be selected again.",
            });
        } catch (error) {
            console.error("Re-apply failed:", error);
            toast({
                title: "Error",
                description: "Failed to process re-application penalty.",
                variant: 'destructive'
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card className="border-amber-500/50 bg-amber-50/50">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                    <Hourglass className="h-5 w-5" />
                    Offer Expired
                </CardTitle>
                <CardDescription>
                    Your offer for this job expired. You can request to be re-included for consideration, but this will incur a small reputation penalty.
                </CardDescription>
            </CardHeader>
            <CardFooter>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="warning" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            <RefreshCcw className="mr-2 h-4 w-4" />
                            Request to Re-apply (-15 Points)
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Confirm Re-application Request</AlertDialogTitle>
                            <AlertDialogDescription>
                                Are you sure you want to request to be re-included? A penalty of 15 reputation points will be deducted from your profile for missing the original deadline.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleReapply} className={buttonVariants({ variant: "warning" })}>
                                Yes, Request Re-application
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </CardFooter>
        </Card>
    );
}
