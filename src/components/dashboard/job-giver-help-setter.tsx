"use client";

import { useEffect } from "react";
import { useHelp } from "@/hooks/use-help";

export function JobGiverHelpSetter() {
    const { setHelp } = useHelp();

    useEffect(() => {
        setHelp({
            title: 'Job Giver Dashboard Guide',
            content: (
                <div className="space-y-4 text-sm">
                    <p>Welcome to your Dashboard! This is your control center for hiring and managing installers.</p>
                    <ul className="list-disc space-y-2 pl-5">
                        <li><span className="font-semibold">Active Jobs:</span> Manage open jobs.</li>
                        <li><span className="font-semibold">Funds in Secure Deposit:</span> Secured funds for jobs.</li>
                        <li><span className="font-semibold">Completed Jobs:</span> View history.</li>
                        <li><span className="font-semibold">Need an Installer?:</span> Post a new job.</li>
                    </ul>
                    <p>Use the navigation on the left to access other sections.</p>
                </div>
            )
        });
    }, [setHelp]);

    return null;
}
