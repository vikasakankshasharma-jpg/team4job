"use client";

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useFirebase } from "@/hooks/use-user";
import { useToast } from "@/hooks/use-toast";
import { Job, User } from "@/lib/types";
import { collection, query, where, getDocs, addDoc, updateDoc, doc, arrayUnion, serverTimestamp } from "firebase/firestore";
import { Send, CheckCircle2 } from "lucide-react";

interface InviteToJobDialogProps {
    isOpen: boolean;
    onClose: () => void;
    installer: User;
    currentUser: User;
}

export function InviteToJobDialog({
    isOpen,
    onClose,
    installer,
    currentUser,
}: InviteToJobDialogProps) {
    const { db } = useFirebase();
    const { toast } = useToast();
    const [openJobs, setOpenJobs] = useState<Job[]>([]);
    const [selectedJob, setSelectedJob] = useState<Job | null>(null);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);

    useEffect(() => {
        const fetchOpenJobs = async () => {
            if (!db || !isOpen) return;

            try {
                setLoading(true);
                const jobsQuery = query(
                    collection(db, "jobs"),
                    where("jobGiverId", "==", currentUser.id),
                    where("status", "==", "Open for Bidding")
                );

                const jobsSnapshot = await getDocs(jobsQuery);
                const jobs = jobsSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                } as Job));

                setOpenJobs(jobs);
            } catch (error) {
                console.error("Error fetching open jobs:", error);
                toast({
                    title: "Error",
                    description: "Failed to load open jobs",
                    variant: "destructive",
                });
            } finally {
                setLoading(false);
            }
        };

        fetchOpenJobs();
    }, [db, isOpen, currentUser.id, toast]);

    const handleSendInvite = async () => {
        if (!selectedJob || !db) return;

        try {
            setSending(true);

            // Create notification for installer
            await addDoc(collection(db, "notifications"), {
                recipientId: installer.id,
                type: "job_invite",
                title: "Job Invitation",
                message: `${currentUser.name} has invited you to bid on "${selectedJob.title}"`,
                actionUrl: `/dashboard/jobs/browse`,
                metadata: {
                    jobId: selectedJob.id,
                    jobTitle: selectedJob.title,
                    invitedBy: currentUser.id,
                },
                createdAt: serverTimestamp(),
                read: false,
            });

            // Optionally add to job's invited list
            const jobRef = doc(db, "jobs", selectedJob.id!);
            await updateDoc(jobRef, {
                invitedInstallers: arrayUnion(installer.id),
            });

            toast({
                title: "Invitation Sent!",
                description: `${installer.name} will be notified about this job opportunity.`,
            });

            onClose();
            setSelectedJob(null);
        } catch (error) {
            console.error("Error sending invite:", error);
            toast({
                title: "Error",
                description: "Failed to send invitation. Please try again.",
                variant: "destructive",
            });
        } finally {
            setSending(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Invite {installer.name} to a Job</DialogTitle>
                    <DialogDescription>
                        Select one of your open jobs to invite this installer
                    </DialogDescription>
                </DialogHeader>

                {loading ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map(i => (
                            <Skeleton key={i} className="h-20" />
                        ))}
                    </div>
                ) : openJobs.length > 0 ? (
                    <>
                        <ScrollArea className="max-h-[300px] pr-4">
                            <div className="space-y-2">
                                {openJobs.map(job => (
                                    <div
                                        key={job.id}
                                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${selectedJob?.id === job.id
                                                ? "border-primary bg-primary/5"
                                                : "hover:bg-accent"
                                            }`}
                                        onClick={() => setSelectedJob(job)}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium truncate">{job.title}</p>
                                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                    <Badge variant="outline" className="text-xs">
                                                        {job.jobCategory}
                                                    </Badge>
                                                    {job.priceEstimate && (
                                                        <span className="text-xs text-muted-foreground">
                                                            ₹{job.priceEstimate.min?.toLocaleString()} - ₹
                                                            {job.priceEstimate.max?.toLocaleString()}
                                                        </span>
                                                    )}
                                                </div>
                                                {job.bids && job.bids.length > 0 && (
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        {job.bids.length} bid{job.bids.length !== 1 ? "s" : ""} received
                                                    </p>
                                                )}
                                            </div>
                                            {selectedJob?.id === job.id && (
                                                <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>

                        <DialogFooter>
                            <Button variant="outline" onClick={onClose} disabled={sending}>
                                Cancel
                            </Button>
                            <Button onClick={handleSendInvite} disabled={!selectedJob || sending}>
                                {sending ? (
                                    "Sending..."
                                ) : (
                                    <>
                                        <Send className="mr-2 h-4 w-4" />
                                        Send Invitation
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </>
                ) : (
                    <div className="text-center py-8 text-muted-foreground">
                        <Send className="h-12 w-12 mx-auto mb-2 opacity-20" />
                        <p className="text-sm font-medium">No Open Jobs</p>
                        <p className="text-xs mt-1">
                            You don't have any jobs open for bidding right now.
                        </p>
                        <Button
                            variant="outline"
                            size="sm"
                            className="mt-4"
                            onClick={() => {
                                onClose();
                                window.location.href = "/dashboard/post-job";
                            }}
                        >
                            Post a New Job
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
