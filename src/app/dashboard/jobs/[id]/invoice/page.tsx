
"use client";

import { useFirebase, useUser } from "@/hooks/use-user";
import { notFound, useParams } from "next/navigation";
import React, { useEffect, useState } from "react";
import { Job, User } from "@/lib/types";
import { getDoc, doc } from "firebase/firestore";
import { Loader2, Printer } from "lucide-react";
import { toDate } from "@/lib/utils";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

function InvoicePageSkeleton() {
    return (
        <div className="flex items-center justify-center h-96">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
    )
}

export default function InvoicePage() {
    const { user, isAdmin } = useUser();
    const { db } = useFirebase();
    const params = useParams();
    const id = params.id as string;

    const [job, setJob] = useState<Job | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id || !db) return;

        const fetchJob = async () => {
            setLoading(true);
            const jobRef = doc(db, 'jobs', id);
            const jobSnap = await getDoc(jobRef);

            if (!jobSnap.exists() || !jobSnap.data().invoice) {
                setJob(null);
                setLoading(false);
                return;
            }

            const jobData = jobSnap.data() as Job;
            const jobGiverSnap = await getDoc(jobData.jobGiver as any);
            const awardedInstallerSnap = jobData.awardedInstaller ? await getDoc(jobData.awardedInstaller as any) : null;

            setJob({
                ...jobData,
                jobGiver: { id: jobGiverSnap.id, ...(jobGiverSnap.data() || {}) } as User,
                awardedInstaller: awardedInstallerSnap ? { id: awardedInstallerSnap.id, ...(awardedInstallerSnap.data() || {}) } as User : undefined,
            });

            setLoading(false);
        };
        fetchJob();

    }, [id, db]);

    if (loading) {
        return <InvoicePageSkeleton />;
    }

    if (!job || !job.invoice) {
        notFound();
    }

    const jobGiver = job.jobGiver as User;
    const installer = job.awardedInstaller as User;

    // Security check: Only involved parties or admin can view
    if (!user || (!isAdmin && user.id !== jobGiver.id && user.id !== installer.id)) {
        notFound();
    }

    const { subtotal, travelTip, totalAmount } = job.invoice;
    const sacCode = "9954"; // SAC for Repair, maintenance and installation services

    return (
        <div className="max-w-4xl mx-auto p-4 sm:p-8 bg-background">
            <div className="flex justify-between items-start mb-8">
                <div>
                    <h1 className="text-3xl font-bold">Invoice</h1>
                    <p className="text-muted-foreground">#{job.invoice.id}</p>
                </div>
                <div className="text-right">
                    <h2 className="text-lg font-semibold">CCTV Job Connect</h2>
                    <p className="text-xs text-muted-foreground">Platform Facilitator</p>
                </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-8 mb-8">
                <div>
                    <h3 className="font-semibold mb-2">Billed To:</h3>
                    <div className="text-sm text-muted-foreground">
                        <p className="font-bold text-foreground">{jobGiver.name}</p>
                        <p>{jobGiver.address.fullAddress}</p>
                        {jobGiver.gstin && <p><strong>GSTIN:</strong> {jobGiver.gstin}</p>}
                    </div>
                </div>
                <div className="sm:text-right">
                    <h3 className="font-semibold mb-2">From (Service Provider):</h3>
                    <div className="text-sm text-muted-foreground">
                        <p className="font-bold text-foreground">{installer.name}</p>
                        <p>{installer.address.fullAddress}</p>
                        {installer.gstin && <p><strong>GSTIN:</strong> {installer.gstin}</p>}
                    </div>
                </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-8 mb-8 text-sm">
                <div>
                    <h3 className="font-semibold mb-2">Invoice Date</h3>
                    <p>{format(toDate(job.invoice.date), 'MMMM d, yyyy')}</p>
                </div>
                <div>
                    <h3 className="font-semibold mb-2">Job Completion Date</h3>
                    <p>{format(toDate(job.invoice.date), 'MMMM d, yyyy')}</p>
                </div>
                <div className="sm:text-right">
                    <h3 className="font-semibold mb-2">Place of Supply</h3>
                    <p>{job.location}</p>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b">
                            <th className="p-2 text-left font-semibold">Description</th>
                            <th className="p-2 text-center font-semibold">SAC Code</th>
                            <th className="p-2 text-right font-semibold">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr className="border-b">
                            <td className="p-2">
                                <p className="font-medium">{job.title}</p>
                                <p className="text-xs text-muted-foreground">Job ID: {job.id}</p>
                            </td>
                            <td className="p-2 text-center font-mono">{sacCode}</td>
                            <td className="p-2 text-right font-mono">₹{subtotal.toLocaleString('en-IN')}</td>
                        </tr>
                        {travelTip > 0 && (
                            <tr className="border-b">
                                <td className="p-2">
                                    <p className="font-medium">Travel & Convenience Allowance</p>
                                </td>
                                <td className="p-2 text-center font-mono">{sacCode}</td>
                                <td className="p-2 text-right font-mono">₹{travelTip.toLocaleString('en-IN')}</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className="flex justify-end mt-4">
                <div className="w-full max-w-xs space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span>Subtotal</span>
                        <span>₹{totalAmount.toLocaleString('en-IN')}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-lg font-bold">
                        <span>Total</span>
                        <span>₹{totalAmount.toLocaleString('en-IN')}</span>
                    </div>
                </div>
            </div>

            <Separator className="my-8" />

            <div className="space-y-4 text-xs text-muted-foreground">
                <p><strong className="font-semibold">Note:</strong> This is a digitally generated invoice and does not require a physical signature. The total amount is inclusive of all applicable taxes.</p>
                <p><strong className="font-semibold">Disclaimer:</strong> CCTV Job Connect acts as a marketplace facilitator. The responsibility for GST compliance, including charging the correct tax rate (CGST, SGST, or IGST) and remitting the tax to the government, lies solely with the service provider (Installer). The service recipient (Job Giver) is responsible for verifying the GST details for input tax credit purposes.</p>
            </div>

            <div className="mt-8 text-center print:hidden">
                <Button onClick={() => window.print()}>
                    <Printer className="mr-2 h-4 w-4" />
                    Print / Save as PDF
                </Button>
            </div>
        </div>
    );
}
