
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

        const duration = jobInput.agreedDuration || jobInput.estimatedDuration || 1;
        const unit = jobInput.agreedDurationUnit || jobInput.durationUnit || 'Days';

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
        if (!user.payouts?.beneficiaryId) {
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
            const q = query(
                jobsRef,
                where('awardedInstaller', '==', doc(db, 'users', user.id)),
                where('status', 'in', ['Awarded', 'In Progress', 'Pending Funding']) // Check against all active states
            );
            const snapshot = await getDocs(q);

            const conflicts = snapshot.docs
                .map(d => d.data() as Job)
                .filter(otherJob => {
                    if (otherJob.id === job.id) return false; // Ignore self

                    const otherRange = getJobRange(otherJob);
                    if (!otherRange) return false;

                    // Interval Intersection: (StartA < EndB) && (EndA > StartB)
                    const isOverlapping = (currentRange.start < otherRange.end) && (currentRange.end > otherRange.start);
                    return isOverlapping;
                });

            if (conflicts.length > 0) {
                setConflictingJobs(conflicts);
                setIsConflictDialogOpen(true);
                setIsLoading(false);
                return; // Wait for user confirmation
            }

            // No conflicts, proceed normally
            await processAcceptance([]);

        } catch (error) {
            console.error("Conflict check failed", error);
            setIsLoading(false);
        }
    };

    const processAcceptance = async (conflictsToDecline: Job[]) => {
        setIsLoading(true);
        try {
            if (!db) throw new Error("Database connection unavailable");

            // Zombie Bidder Protection (Round 6 Fix)
            const isSubscribed = user.subscription && toDate(user.subscription.expiresAt) > new Date();
            if (!isSubscribed) {
                toast({
                    title: "Subscription Expired",
                    description: "Your subscription has expired. You must renew to accept this job.",
                    variant: "destructive",
                });
                // Ideally redirect to billing or show a modal, for now a toast block is sufficient security.
                return;
            }

            setIsLoading(true);

            try {
                if (!db) throw new Error("Database connection unavailable");

                const jobRef = doc(db, 'jobs', job.id);
                const fundingDeadline = new Date();
                fundingDeadline.setHours(fundingDeadline.getHours() + 48);

                // Double Booking Check
                const jobsRef = collection(db, 'jobs');
                const q = query(
                    jobsRef,
                    where('awardedInstaller', '==', doc(db, 'users', user.id)),
                    where('status', 'in', ['In Progress', 'Pending Funding'])
                );
                const snapshot = await getDocs(q);
                const newJobStart = toDate(job.jobStartDate);

                const conflictingJob = snapshot.docs.find(d => {
                    const activeJob = d.data() as Job;
                    if (!activeJob.jobStartDate) return false;
                    const activeStart = toDate(activeJob.jobStartDate);
                    // Simple Check: Same Day Conflict
                    return activeStart.toDateString() === newJobStart.toDateString();
                });

                if (conflictingJob) {
                    throw new Error("You already have an active job scheduled for this date. Please decline one to proceed.");
                }

                await runTransaction(db, async (transaction) => {
                    const jobDoc = await transaction.get(jobRef);
                    if (!jobDoc.exists()) {
                        throw new Error("Job does not exist!");
                    }
                    const jobData = jobDoc.data() as Job;

                    if (jobData.awardedInstaller) {
                        throw new Error("This job has already been accepted by another installer.");
                    }

                    // Accept Current Job
                    transaction.update(jobRef, {
                        awardedInstaller: doc(db, 'users', user.id),
                        status: "Pending Funding",
                        selectedInstallers: [],
                        acceptanceDeadline: deleteField(),
                        fundingDeadline: fundingDeadline,
                    });

                    // Auto-Decline Conflicting Jobs
                    for (const conflict of conflictsToDecline) {
                        const conflictRef = doc(db, 'jobs', conflict.id);
                        // Safe logic: Remove installer, set to Bidding Closed (Job Giver will re-open or re-award)
                        transaction.update(conflictRef, {
                            awardedInstaller: deleteField(),
                            status: 'Bidding Closed',
                            disqualifiedInstallerIds: arrayUnion(user.id),
                            acceptanceDeadline: deleteField()
                        });
                    }
                });

                const updateLocal = {
                    awardedInstaller: doc(db, 'users', user.id),
                    status: "Pending Funding" as const,
                    selectedInstallers: [],
                    acceptanceDeadline: deleteField(),
                    fundingDeadline: fundingDeadline,
                };
                await onJobUpdate(updateLocal as any);

                console.log("InstallerAcceptanceSection: Transaction completed");

                if ((job.jobGiver as User)?.email) {
                    await sendNotification(
                        (job.jobGiver as User).email,
                        "Job Accepted!",
                        `Installer ${user.name} has accepted your job "${job.title}". Please proceed to funding to start the work.`
                    );
                }

                toast({ title: "Job Accepted!", description: "You have successfully accepted the job." });

            } catch (e: any) {
                console.error("InstallerAcceptanceSection: Transaction failed", e);
                toast({
                    title: "Acceptance Failed",
                    description: e.message || "Could not accept job. It may have been taken.",
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
                            <Button onClick={handleAcceptClick} className="flex-1" disabled={isLoading}>
                                <Award className="mr-2 h-4 w-4" /> Accept Job
                            </Button>
                            <Button onClick={handleDecline} variant="destructive" className="flex-1" disabled={isLoading}>
                                <ThumbsDown className="mr-2 h-4 w-4" /> Decline Offer
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <AlertDialog open={isConflictDialogOpen} onOpenChange={setIsConflictDialogOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Availability Conflict Detected</AlertDialogTitle>
                            <AlertDialogDescription>
                                You have {conflictingJobs.length} other pending job awards for this same date.
                                Accepting this job will <strong>automatically decline</strong> the other offers to prevent double-booking.
                                <br /><br />
                                <strong>Jobs to be declined:</strong>
                                <ul className="list-disc pl-5 mt-2">
                                    {conflictingJobs.map(j => {
                                        const range = getJobRange(j);
                                        const rangeText = range ? `${range.start.toLocaleDateString()} - ${range.end.toLocaleDateString()}` : 'Unknown Date';
                                        return (
                                            <li key={j.id}>
                                                <span className="font-medium">{j.title}</span>
                                                <span className="text-xs text-muted-foreground ml-2">({rangeText})</span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => {
                                setIsConflictDialogOpen(false);
                                processAcceptance(conflictingJobs);
                            }} className="bg-red-600 hover:bg-red-700">
                                Confirm & Auto-Decline
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </>
        );
    }

