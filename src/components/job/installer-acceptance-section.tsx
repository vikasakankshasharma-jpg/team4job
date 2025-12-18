
"use client";

import { Award, ThumbsDown } from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Job } from "@/lib/types";
import { toDate } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { arrayUnion, doc } from "firebase/firestore";
import React from "react";
import { useUser, useFirebase } from "@/hooks/use-user";
import { useToast } from "@/hooks/use-toast";

export const tierIcons = {
    Bronze: <Award className="h-4 w-4 text-yellow-700" />,
    Silver: <Award className="h-4 w-4 text-gray-400" />,
    Gold: <Award className="h-4 w-4 text-amber-500" />,
    Platinum: <Award className="h-4 w-4 text-cyan-400" />,
};

export function InstallerAcceptanceSection({ job, onJobUpdate }: { job: Job, onJobUpdate: (updatedJob: Partial<Job>) => void }) {
    const { user } = useUser();
    const { db } = useFirebase();
    const [isLoading, setIsLoading] = React.useState(false);

    if (!user || !db) return null;

    const { toast } = useToast();

    const handleAccept = async () => {
        if (!user.payouts?.beneficiaryId) {
            toast({
                title: "Action Required: Setup Payouts",
                description: "Please set up your bank account in your profile to ensure timely payments.",
                variant: "default",
            });
        }
        setIsLoading(true);
        const fundingDeadline = new Date();
        fundingDeadline.setHours(fundingDeadline.getHours() + 48); // 48 hours for job giver to fund

        const update = {
            awardedInstaller: doc(db, 'users', user.id),
            status: "Pending Funding" as const,
            selectedInstallers: [], // Clear the selections, as this installer won
            acceptanceDeadline: undefined, // Clear the acceptance deadline
            fundingDeadline: fundingDeadline,
        };
        await onJobUpdate(update);
        setIsLoading(false);
    };

    const handleDecline = async () => {
        setIsLoading(true);
        // Remove current user from selected installers
        const remainingOffers = (job.selectedInstallers || [])
            .filter(s => s.installerId !== user.id)
            .sort((a, b) => (a.rank || 0) - (b.rank || 0)); // Ensure sorted by rank

        let update: Partial<Job> = {
            disqualifiedInstallerIds: arrayUnion(user.id) as any,
            selectedInstallers: remainingOffers,
        };

        if (remainingOffers.length === 0) {
            // No one left
            update.status = "Bidding Closed";
            update.awardedInstaller = undefined; // Clear award
            update.acceptanceDeadline = undefined;
        } else {
            // Escalate to next candidate immediately if Awarded
            // Assuming this component is only shown when 'Awarded' and user is the awarded installer?
            // Actually, 'Awarded' status usually means `job.awardedInstaller` is set to THIS user.
            // So if I decline, I must pass the baton.

            const nextCandidate = remainingOffers[0];
            const acceptanceDeadline = new Date();
            acceptanceDeadline.setHours(acceptanceDeadline.getHours() + 24); // Reset 24h timer for next person

            update.awardedInstaller = doc(db, 'users', nextCandidate.installerId);
            update.acceptanceDeadline = acceptanceDeadline;
            // Status stays "Awarded"

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
        <Card className="bg-primary/5 border-primary/20">
            <CardHeader>
                <CardTitle>You've Been Selected!</CardTitle>
                <CardDescription>
                    The Job Giver has sent you an offer for this project. Please respond before the offer expires.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-primary font-semibold mb-4">Offer expires: {timeRemaining}</p>
                <div className="flex gap-4">
                    <Button onClick={handleAccept} className="flex-1" disabled={isLoading}>
                        <Award className="mr-2 h-4 w-4" /> Accept Job
                    </Button>
                    <Button onClick={handleDecline} variant="destructive" className="flex-1" disabled={isLoading}>
                        <ThumbsDown className="mr-2 h-4 w-4" /> Decline Offer
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
