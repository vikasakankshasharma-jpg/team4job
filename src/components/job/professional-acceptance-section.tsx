
"use client";

import React from "react";
import { Award, ThumbsDown, Medal, Gem, AlertOctagon, ShieldCheck } from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Job, User } from "@/lib/types";
import { toDate } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { arrayUnion, doc, deleteField, runTransaction, collection, query, where, getDocs } from "firebase/firestore";
import { sendNotification } from "@/lib/notifications";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-user";
import { useFirebase } from "@/infrastructure/firebase/client-provider";
import { getAuth } from "firebase/auth";
import axios from "axios";
import { acceptJobAction } from "@/app/actions/job.actions";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

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

interface ProfessionalAcceptanceSectionProps {
    job: Job;
    user: User;
    onJobUpdate: (job: Partial<Job>) => Promise<void>;
}

export function ProfessionalAcceptanceSection({ job, user, onJobUpdate }: ProfessionalAcceptanceSectionProps) {
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
            if (!currentRange) {
                // No date range available – skip conflict check and proceed directly
                setIsLoading(false);
                await processAcceptance();
                return;
            }

            // Query for OTHER jobs awarded to this user
            // We fetch all 'Awarded' and filter in memory for complex date ranges
            // Simplify query to avoid potential index issues in emulator
            const q = query(
                jobsRef,
                where('awardedProfessional', '==', doc(db, 'users', user.id))
            );

            const snapshot = await getDocs(q);

            const conflicts = snapshot.docs
                .map(d => ({ id: d.id, ...(d.data() as any) } as Job))
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

            if (conflicts.length > 0) {
                setConflictingJobs(conflicts);
                setIsConflictDialogOpen(true);
                setIsLoading(false);
                return; // Wait for user confirmation
            }

            // No conflicts, proceed normally
            await processAcceptance();

        } catch (error) {
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
        // Remove current user from selected Professionals
        const remainingOffers = (job.selectedProfessionals || [])
            .filter(s => s.professionalId !== user.id)
            .sort((a, b) => (a.rank || 0) - (b.rank || 0));

        const update: Partial<Job> = {
            disqualifiedProfessionalIds: arrayUnion(user.id) as any,
            selectedProfessionals: remainingOffers,
        };

        if (remainingOffers.length === 0) {
            update.status = "Bidding Closed";
            update.awardedProfessional = undefined;
            update.acceptanceDeadline = undefined;
        } else {
            const nextCandidate = remainingOffers[0];
            const acceptanceDeadline = new Date();
            acceptanceDeadline.setHours(acceptanceDeadline.getHours() + 24);

            update.awardedProfessional = doc(db, 'users', nextCandidate.professionalId);
            update.acceptanceDeadline = acceptanceDeadline;

            toast({
                title: "Offer Declined",
                description: "The offer has been passed to the next Professional.",
            });
        }

        await onJobUpdate(update);
        setIsLoading(false);
    };

    const timeRemaining = job.acceptanceDeadline ? formatDistanceToNow(toDate(job.acceptanceDeadline), { addSuffix: true }) : '';

    return (
        <AnimatePresence mode="wait">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative group"
            >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/5 to-accent/10 blur-3xl opacity-20 -z-10" />
                
                <Card className="border-none shadow-[0_45px_120px_rgba(0,0,0,0.2)] bg-surface-container-low/40 dark:bg-slate-900/60 backdrop-blur-3xl rounded-[3.5rem] overflow-hidden ring-1 ring-white/5 relative">
                    <div className="h-2 w-full bg-gradient-to-r from-primary via-accent to-primary animate-gradient-x opacity-30" />
                    
                    <CardHeader className="p-10 pb-6 text-center sm:text-left relative z-10">
                        <div className="flex flex-col sm:flex-row items-center gap-10">
                            <div className="h-24 w-24 rounded-[2.5rem] bg-primary/10 text-primary flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-700 relative shrink-0">
                                <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                                <Award className="h-12 w-12 relative z-10" />
                            </div>
                            <div className="flex-1">
                                <CardTitle className="text-6xl sm:text-7xl md:text-8xl font-black tracking-tighter italic uppercase bg-gradient-to-br from-foreground to-foreground/50 bg-clip-text text-transparent leading-[0.85] mb-4">
                                    Selection Authorized
                                </CardTitle>
                                <CardDescription className="text-lg font-medium opacity-70 leading-relaxed max-w-xl italic">
                                    Strategic engagement established. The initiator has prioritized your profile for this production mission.
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="p-10 pt-0 space-y-12 relative z-10">
                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-6">
                            <div className="bg-primary/5 px-8 py-4 rounded-[1.5rem] flex items-center gap-4 border border-white/5 backdrop-blur-md shadow-xl">
                                <div className="h-2.5 w-2.5 rounded-full bg-primary animate-pulse shadow-[0_0_12px_rgba(var(--primary),0.6)]" />
                                <span className="text-[11px] font-black uppercase tracking-[0.4em] text-primary italic">
                                    WINDOW EXPIRES {timeRemaining}
                                </span>
                            </div>
                            
                            <div className="bg-success/5 px-8 py-4 rounded-[1.5rem] flex items-center gap-4 border border-white/5 backdrop-blur-md shadow-xl">
                                <ShieldCheck className="h-5 w-5 text-success" />
                                <span className="text-[11px] font-black uppercase tracking-[0.4em] text-success italic">
                                    ESCROW PROTECTION ACTIVE
                                </span>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-6">
                            <Button 
                                onClick={handleAcceptClick} 
                                className="h-20 flex-1 rounded-[2rem] bg-primary text-primary-foreground font-black text-xs uppercase tracking-[0.4em] shadow-2xl shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-1 transition-all active:scale-95 group overflow-hidden relative" 
                                disabled={isLoading} 
                                data-testid="accept-job-button"
                            >
                                <span className="relative z-10 flex items-center justify-center italic">
                                    Authorize Engagement
                                </span>
                                <div className="absolute inset-0 bg-background/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                            </Button>
                            
                            <Button 
                                onClick={handleDecline} 
                                variant="ghost" 
                                className="h-20 flex-1 sm:flex-none px-12 rounded-[2rem] font-black text-xs uppercase tracking-[0.3em] text-muted-foreground/60 hover:bg-destructive/10 hover:text-destructive transition-all active:scale-95 italic" 
                                disabled={isLoading} 
                                data-testid="decline-job-button"
                            >
                                Decline Role
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            <AlertDialog open={isConflictDialogOpen} onOpenChange={setIsConflictDialogOpen}>
                <AlertDialogContent className="max-w-xl p-0 overflow-hidden border-none rounded-[3.5rem] bg-background font-sans shadow-2xl ring-1 ring-white/10">
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-background to-destructive/10 pointer-events-none" />
                    <div className="relative p-12 space-y-12">
                        <header className="space-y-6">
                            <div className="inline-flex items-center justify-center h-20 w-20 rounded-[2.5rem] bg-amber-500/10 text-amber-500 shadow-inner mb-2 animate-pulse border border-amber-500/20 relative">
                                <div className="absolute inset-0 bg-amber-500/20 blur-xl rounded-full" />
                                <AlertOctagon className="h-10 w-10 relative z-10" />
                            </div>
                            <AlertDialogTitle className="text-4xl font-black tracking-tighter italic uppercase text-amber-500 leading-none">
                                Schedule Overlap Detected
                            </AlertDialogTitle>
                            <AlertDialogDescription className="text-[11px] font-black uppercase tracking-[0.4em] text-amber-500/60 italic leading-none">
                                Temporal redundancy: {conflictingJobs.length} active engagements in window
                            </AlertDialogDescription>
                        </header>

                        <div className="bg-surface-container-low/60 backdrop-blur-3xl p-10 rounded-[3rem] border border-white/5 shadow-inner space-y-8">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.5em] text-muted-foreground opacity-30 italic">Active Mission Overlap Log</h4>
                            <ul className="space-y-6">
                                {conflictingJobs.slice(0, 3).map(j => {
                                    const range = getJobRange(j);
                                    const rangeText = range ? `${range.start.toLocaleDateString()} - ${range.end.toLocaleDateString()}` : 'Unknown Date';
                                    return (
                                        <li key={j.id} className="flex items-center justify-between group">
                                            <div className="space-y-1">
                                                <p className="font-black italic uppercase text-sm tracking-tight group-hover:text-amber-500 transition-colors leading-none">{j.title}</p>
                                                <p className="text-[9px] font-bold uppercase tracking-[0.3em] opacity-30 leading-none">{rangeText}</p>
                                            </div>
                                            <div className="h-2.5 w-2.5 rounded-full bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.6)]" />
                                        </li>
                                    );
                                })}
                                {conflictingJobs.length > 3 && (
                                    <li className="text-[10px] font-black uppercase tracking-[0.3em] opacity-20 italic pt-6 border-t border-white/5 text-center">
                                        + {conflictingJobs.length - 3} auxiliary overlaps identified
                                    </li>
                                )}
                            </ul>
                        </div>

                        <div className="p-8 rounded-[2rem] bg-destructive/5 border border-destructive/10">
                            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-destructive mb-3 leading-none italic">Protocol Risk Notice</p>
                            <p className="text-[11px] text-destructive/70 font-bold italic uppercase tracking-tight leading-relaxed">
                                Conflict resolution is mandatory. Failure to deliver may compromise platform trust metrics and account authorization.
                            </p>
                        </div>

                        <AlertDialogFooter className="flex flex-col sm:flex-row gap-6 pt-4">
                            <AlertDialogCancel className="h-16 flex-1 rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.3em] border border-white/10 bg-background/50 hover:bg-muted transition-all opacity-60">
                                Review Timeline
                            </AlertDialogCancel>
                            <Button 
                                onClick={() => {
                                    setIsConflictDialogOpen(false);
                                    processAcceptance();
                                }} 
                                className="h-16 flex-[2] rounded-[1.5rem] bg-amber-500 text-white font-black text-xs uppercase tracking-[0.4em] shadow-2xl shadow-amber-500/30 hover:bg-amber-600 transition-all active:scale-95 italic"
                                data-testid="bypass-conflict-button"
                            >
                                Bypass & Authorize
                            </Button>
                        </AlertDialogFooter>
                    </div>
                </AlertDialogContent>
            </AlertDialog>
        </AnimatePresence>
    );
}


