"use client";

import { useEffect } from "react";
import { useHelp } from "@/hooks/use-help";
import { User } from "@/lib/types";

export function InstallerHelpSetter({ isVerified }: { isVerified?: boolean; }) {
    const { setHelp } = useHelp();

    useEffect(() => {
        setHelp({
            title: 'Installer Dashboard Guide',
            content: (
                <div className="space-y-4 text-sm">
                    <p>Welcome to your Dashboard! This is your central hub for managing your work on the platform.</p>
                    <ul className="list-disc space-y-2 pl-5">
                        <li>
                            <span className="font-semibold">Open Jobs:</span> This shows the total number of jobs currently available for bidding. Click it to find your next opportunity.
                        </li>
                        <li>
                            <span className="font-semibold">My Bids:</span> Tracks all the jobs you&apos;ve bid on and their current status (Bidded, Awarded, etc.). Click to see your bidding history.
                        </li>
                        <li>
                            <span className="font-semibold">Jobs Won:</span> Displays the number of jobs you&apos;ve won that are currently active or in progress.
                        </li>
                        <li>
                            <span className="font-semibold">Projected Earnings:</span> The total value of jobs currently in the &quot;Funded&quot; (Locked) state that you are working on.
                        </li>
                        {!isVerified && (
                            <li>
                                <span className="font-semibold">Verification:</span> Complete your Aadhar verification to become a trusted installer and increase your chances of winning jobs.
                            </li>
                        )}
                        <li>
                            <span className="font-semibold">Find Your Next Project:</span> A quick link to jump directly to the job browsing page.
                        </li>
                    </ul>
                    <p>Use the navigation on the left to access other sections like your Profile, where you can track your reputation and skills.</p>
                </div>
            )
        });
    }, [setHelp, isVerified]);

    return null;
}
