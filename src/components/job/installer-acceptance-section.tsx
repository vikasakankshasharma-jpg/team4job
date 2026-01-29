
"use client";

import React from "react";
import { Award, ThumbsDown, Medal, Gem } from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Job, User } from "@/lib/types";
import { toDate } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { arrayUnion, doc, deleteField, runTransaction, collection, query, where, getDocs } from "firebase/firestore";
import { sendNotification } from "@/lib/notifications";
import { useToast } from "@/hooks/use-toast";
import { useUser, useFirebase } from "@/hooks/use-user";
import { getAuth } from "firebase/auth";
import axios from "axios";
import { acceptJobAction } from "@/app/actions/job.actions";

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const tierIcons: Record<string, React.ReactNode> = {
    Bronze: <Medal className="h-6 w-6 text-yellow-700" />,
    Silver: <Medal className="h-6 w-6 text-gray-400" />,
    Gold: <Gem className="h-6 w-6 text-amber-500" />,
    Platinum: <Gem className="h-6 w-6 text-cyan-400" />,
};

interface InstallerAcceptanceSectionProps {
    job: Job;
    user: User;
    onJobUpdate: (job: Partial<Job>) => Promise<void>;
}

export function InstallerAcceptanceSection({ job, user, onJobUpdate }: InstallerAcceptanceSectionProps) {
    const [isLoading, setIsLoading] = React.useState(false);
    const [conflictingJobs, setConflictingJobs] = React.useState<Job[]>([]);
    const [isConflictDialogOpen, setIsConflictDialogOpen] = React.useState(false);
    const { toast } = useToast();
    const { db } = useFirebase();

    // Helper to calculate job range (Phase 12 Update)
    const getJobRange = (jobInput: Job) => {
        if (!jobInput.jobStartDate) return null;
        const start = toDate(jobInput.jobStartDate);
        const end = new Date(start);

        const duration = (jobInput as any).agreedDuration || (jobInput as any).estimatedDuration || 1;
        const unit = (jobInput as any).agreedDurationUnit || (jobInput as any).durationUnit || 'Days';

        if (unit === 'Hours') {
            // Hourly: Exact time block
            end.setHours(end.getHours() + duration);
        } else {
            // Daily: Force full-day blocking (00:00 to 23:59)
            // If unit is Days, we want to block the entire days involved to represent full allocation.
            start.setHours(0, 0, 0, 0);

            // For End Date: Add duration days, then set to end of that day
            // If duration is 1 day, it covers Start 00:00 to Start 23:59
            // Example: 1 Day -> Start Mon 00:00, End Mon 23:59
            // Example: 2 Days -> Start Mon 00:00, End Tue 23:59
            // Calculation:
            end.setTime(start.getTime()); // Reset to start 00:00 base
            end.setDate(end.getDate() + Math.max(0, duration - 1));
            end.setHours(23, 59, 59, 999);
        }
        return { start, end };
    };

    const handleAcceptClick = async () => {
        console.log("InstallerAcceptanceSection: Accept clicked", { payouts: user.payouts, id: user.id });
        if (!user.payouts?.beneficiaryId) {
            console.log("InstallerAcceptanceSection: Missing beneficiaryId");
            toast({
                title: "Action Required: Setup Payouts",
                description: "Please set up your bank account in your profile to ensure timely payments.",
                variant: "default",
            });
            return;
        }

        // 1. Check for Conflicts (Multi-Day Logic)
        if (!db || !job.jobStartDate) return;
        setIsLoading(true);
        try {
            const jobsRef = collection(db, 'jobs');

            // Current Job Range
            const currentRange = getJobRange(job);
            if (!currentRange) return;

            // Query for OTHER jobs awarded to this user
            // We fetch all 'Awarded' and filter in memory for complex date ranges
            console.log('InstallerAcceptanceSection: Conflict query started for user', user.id);
            // Simplify query to avoid potential index issues in emulator
            const q = query(
                jobsRef,
                where('awardedInstaller', '==', doc(db, 'users', user.id))
            );

            const snapshot = await getDocs(q);

            const conflicts = snapshot.docs
                .map(d => d.data() as Job)
                .filter(otherJob => {
                    // Filter status client-side
                    if (!['Awarded', 'In Progress', 'Pending Funding'].includes(otherJob.status)) return false;

                    if (otherJob.id === job.id) return false; // Ignore self

                    const otherRange = getJobRange(otherJob);
                    if (!otherRange) return false;

                    // Interval Intersection: (StartA < EndB) && (EndA > StartB)
                    const isOverlapping = (currentRange.start < otherRange.end) && (currentRange.end > otherRange.start);
                    return isOverlapping;
                });

            console.log('InstallerAcceptanceSection: Conflict check complete', { conflictsCount: conflicts.length });

            if (conflicts.length > 0) {
                setConflictingJobs(conflicts);
                setIsConflictDialogOpen(true);
                setIsLoading(false);
                return; // Wait for user confirmation
            }

            // No conflicts, proceed normally
            await processAcceptance();

        } catch (error) {
            console.error("Conflict check failed", error);
            setIsLoading(false);
        }
    };

    const processAcceptance = async () => {
        setIsLoading(true);
        try {
            const result = await acceptJobAction(job.id, user.id);

            if (!result.success) {
                throw new Error(result.error || 'Failed to accept job');
            }

            toast({ title: "Job Accepted!", description: "You have successfully accepted the job. Please wait for funding." });

            // Force status update locally if needed for UI smoothness
            // onJobUpdate({ status: 'Pending Funding' }); 

        } catch (e: any) {
            console.error("InstallerAcceptanceSection: Acceptance failed", e);
            toast({
                title: "Acceptance Failed",
                description: e.message || "Could not accept job.",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDecline = async () => {
        if (!db) return;
        setIsLoading(true);
        // Remove current user from selected installers
        const remainingOffers = (job.selectedInstallers || [])
            .filter(s => s.installerId !== user.id)
            .sort((a, b) => (a.rank || 0) - (b.rank || 0));

        let update: Partial<Job> = {
            disqualifiedInstallerIds: arrayUnion(user.id) as any,
            selectedInstallers: remainingOffers,
        };

        if (remainingOffers.length === 0) {
            update.status = "Bidding Closed";
            update.awardedInstaller = undefined;
            update.acceptanceDeadline = undefined;
        } else {
            const nextCandidate = remainingOffers[0];
            const acceptanceDeadline = new Date();
            acceptanceDeadline.setHours(acceptanceDeadline.getHours() + 24);

            update.awardedInstaller = doc(db, 'users', nextCandidate.installerId);
            update.acceptanceDeadline = acceptanceDeadline;

            toast({
                title: "Offer Declined",
                description: "The offer has been passed to the next installer.",
            });
        }

        await onJobUpdate(update);
        setIsLoading(false);
    };

    const timeRemaining = job.acceptanceDeadline ? formatDistanceToNow(toDate(job.acceptanceDeadline), { addSuffix: true }) : '';

    return (
        <>
            <Card className="bg-primary/5 border-primary/20">
                <CardHeader>
                    <CardTitle>You&apos;ve Been Selected!</CardTitle>
                    <CardDescription>
                        The Job Giver has sent you an offer for this project. Please respond before the offer expires.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-primary font-semibold mb-4">Offer expires: {timeRemaining}</p>
                    <div className="flex gap-4">
                        <Button onClick={handleAcceptClick} className="flex-1" disabled={isLoading} data-testid="accept-job-button">
                            <Award className="mr-2 h-4 w-4" /> Accept Job
                        </Button>
                        <Button onClick={handleDecline} variant="destructive" className="flex-1" disabled={isLoading} data-testid="decline-job-button">
                            <ThumbsDown className="mr-2 h-4 w-4" /> Decline Offer
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <AlertDialog open={isConflictDialogOpen} onOpenChange={setIsConflictDialogOpen}>
                <AlertDialogContent className="max-h-[80vh] overflow-y-auto w-[95vw] sm:w-full rounded-lg">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Schedule Conflict Warning</AlertDialogTitle>
                        <AlertDialogDescription className="text-left text-sm">
                            You have {conflictingJobs.length} other active/pending jobs for this date range.
                            Accepting this job will result in overlapping schedules.
                            <br /><br />
                            <strong>It is your responsibility to manage your time effectively.</strong>
                            Failure to complete jobs on time may result in negative reputation points.
                        </AlertDialogDescription>
                        <div className="text-sm text-muted-foreground mt-4">
                            <strong>Conflicting Jobs:</strong>
                            <ul className="list-disc pl-5 mt-2">
                                {conflictingJobs.slice(0, 3).map(j => {
                                    const range = getJobRange(j);
                                    const rangeText = range ? `${range.start.toLocaleDateString()} - ${range.end.toLocaleDateString()}` : 'Unknown Date';
                                    return (
                                        <li key={j.id}>
                                            <span className="font-medium">{j.title}</span>
                                            <span className="text-xs text-muted-foreground ml-2">({rangeText})</span>
                                        </li>
                                    );
                                })}
                                {conflictingJobs.length > 3 && (
                                    <li className="text-muted-foreground italic text-xs mt-1">
                                        ...and {conflictingJobs.length - 3} others
                                    </li>
                                )}
                            </ul>
                        </div>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-2">
                        <AlertDialogCancel className="w-full sm:w-auto mt-2 sm:mt-0">Cancel</AlertDialogCancel>
                        <Button onClick={() => {
                            console.log("InstallerAcceptanceSection: Conflict Warning Accepted");
                            setIsConflictDialogOpen(false);
                            processAcceptance();
                        }} className="bg-yellow-600 hover:bg-yellow-700 w-full sm:w-auto">
                            I Understand, Proceed & Accept
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

