
"use client";

import { useFirebase, useUser } from "@/hooks/use-user";
import { notFound, useParams } from "next/navigation";
import React, { useEffect, useState } from "react";
import { Job, User } from "@/lib/types";
import { getDoc, doc, DocumentReference } from "firebase/firestore";
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
            const jobData = jobSnap.data();

            if (!jobSnap.exists() || !jobData || !jobData.invoice) {
                setJob(null);
                setLoading(false);
                return;
            }

            const jobGiverRef = jobData.jobGiver as DocumentReference;
            const jobGiverSnap = await getDoc(jobGiverRef);
            const jobGiverData = jobGiverSnap.data();

            if (!jobGiverData) {
                setJob(null);
                setLoading(false);
                return;
            }

            let awardedInstaller: User | undefined = undefined;
            if (jobData.awardedInstaller) {
                const awardedInstallerRef = jobData.awardedInstaller as DocumentReference;
                const awardedInstallerSnap = await getDoc(awardedInstallerRef);
                const awardedInstallerData = awardedInstallerSnap.data();

                if (awardedInstallerSnap.exists() && awardedInstallerData) {
                    awardedInstaller = { id: awardedInstallerSnap.id, ...awardedInstallerData } as User;
                }
            }

            setJob({
                ...(jobData as Job),
                jobGiver: { id: jobGiverSnap.id, ...jobGiverData } as User,
                awardedInstaller: awardedInstaller,
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

    if (!user || (!isAdmin && user.id !== jobGiver.id && user.id !== installer.id)) {
        notFound();
    }

    const { subtotal, travelTip } = job.invoice;
    const sacCode = "9954";

    // Use billingSnapshot for tax calculation to prevent "Tax Drift"
    // This ensures we use the installer's details at the time of job award
    const billingData = job.billingSnapshot || {
        installerName: installer.name,
        installerAddress: installer.address,
        gstin: installer.gstin || '',
        pan: installer.pan || ''
    };

    // Check if installer is GST registered (from snapshot)
    const isGstRegistered = !!billingData.gstin;
    const gstRate = isGstRegistered ? 0.18 : 0;

    const taxableValue = subtotal + travelTip;
    const gstAmount = taxableValue * gstRate;
    const grandTotal = taxableValue + gstAmount;

    // Simple state detection from pincode (first 2 digits in India roughly Map to states, but full mapping is complex)
    // For now, we'll just split into CGST/SGST if registered.
    const cgstRate = gstRate / 2;
    const sgstRate = gstRate / 2;
    const cgstAmount = taxableValue * cgstRate;
    const sgstAmount = taxableValue * sgstRate;

    return (
        <div className="max-w-4xl mx-auto p-4 sm:p-8 bg-background">
            <div className="flex justify-between items-start mb-8">
                <div>
                    <h1 className="text-3xl font-bold">Invoice</h1>
                    <p className="text-muted-foreground">#{job.invoice.id}</p>
                </div>
                <div className="text-right"></div>
            </div>

            <div className="grid sm:grid-cols-2 gap-8 mb-8">
                <div>
                    <h3 className="font-semibold mb-2">Billed To (Job Giver):</h3>
                    <div className="text-sm text-muted-foreground">
                        <p className="font-bold text-foreground">{jobGiver.name}</p>
                        <p>{jobGiver.address.fullAddress}</p>
                        {jobGiver.gstin && <p><strong>GSTIN:</strong> {jobGiver.gstin}</p>}
                    </div>
                </div>
                <div className="sm:text-right">
                    <h3 className="font-semibold mb-2">From (Service Provider):</h3>
                    <div className="text-sm text-muted-foreground">
                        <p className="font-bold text-foreground">{billingData.installerName}</p>
                        <p>{billingData.installerAddress.fullAddress}</p>
                        {billingData.gstin && <p><strong>GSTIN:</strong> {billingData.gstin}</p>}
                        {billingData.pan && <p><strong>PAN:</strong> {billingData.pan}</p>}
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
                            <th className="p-2 text-right font-semibold">Taxable Amount</th>
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
                <div className="w-full max-w-sm space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span>Subtotal (Taxable Value)</span>
                        <span>₹{taxableValue.toLocaleString('en-IN')}</span>
                    </div>
                    {isGstRegistered ? (
                        <>
                            <div className="flex justify-between text-xs text-muted-foreground">
                                <span>CGST @ {(cgstRate * 100).toFixed(1)}%</span>
                                <span>₹{cgstAmount.toLocaleString('en-IN')}</span>
                            </div>
                            <div className="flex justify-between text-xs text-muted-foreground">
                                <span>SGST @ {(sgstRate * 100).toFixed(1)}%</span>
                                <span>₹{sgstAmount.toLocaleString('en-IN')}</span>
                            </div>
                        </>
                    ) : (
                        <div className="flex justify-between text-xs text-muted-foreground italic">
                            <span>GST (Not Registered)</span>
                            <span>₹0.00</span>
                        </div>
                    )}
                    <Separator />
                    <div className="flex justify-between text-lg font-bold">
                        <span>Grand Total</span>
                        <span>₹{grandTotal.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</span>
                    </div>
                </div>
            </div>

            <Separator className="my-8" />

            <div className="space-y-4 text-xs text-muted-foreground">
                <p><strong className="font-semibold">Note:</strong> This is a digitally generated invoice on behalf of the service provider by CCTV Job Connect.</p>
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
