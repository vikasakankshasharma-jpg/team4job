"use client";

import { useFirebase, useUser } from "@/hooks/use-user";
import { notFound, useParams, useSearchParams } from "next/navigation";
import React, { useEffect, useState } from "react";
import { Job, User, Transaction } from "@/lib/types";
import { getDoc, doc, DocumentReference, collection, query, where, getDocs, onSnapshot } from "firebase/firestore";
import { Loader2, Printer } from "lucide-react";
import { toDate, getRefId } from "@/lib/utils";
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
    const searchParams = useSearchParams();
    const id = params.id as string;
    const type = searchParams.get('type'); // 'platform' or undefined (default)

    const [job, setJob] = useState<Job | null>(null);
    const [transaction, setTransaction] = useState<Transaction | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id || !db) return;

        setLoading(true);

        const jobRef = doc(db, 'jobs', id);

        // Use real-time listener to handle cases where invoice is generated milliseconds after page load
        const unsubscribe = onSnapshot(jobRef, async (jobSnap) => {
            const jobData = jobSnap.data();

            if (!jobSnap.exists() || !jobData) {
                setJob(null);
                setLoading(false);
                return;
            }

            // Resolving References
            let finalJobGiver = jobData.jobGiver;
            let finalInstaller = jobData.awardedInstaller;

            // Fetch Job Giver
            try {
                const jobGiverId = getRefId(jobData.jobGiver);
                if (jobGiverId) {
                    const jobGiverSnap = await getDoc(doc(db, 'users', jobGiverId));
                    const jobGiverData = jobGiverSnap.data();
                    if (jobGiverData) {
                        finalJobGiver = { id: jobGiverSnap.id, ...jobGiverData } as User;
                    }
                }
            } catch (err) {
                console.warn("Error fetching job giver:", err);
            }

            // Fetch Installer (May fail due to permissions)
            try {
                const awardedInstallerId = getRefId(jobData.awardedInstaller);
                if (awardedInstallerId) {
                    const awardedInstallerSnap = await getDoc(doc(db, 'users', awardedInstallerId));
                    const awardedInstallerData = awardedInstallerSnap.data();
                    if (awardedInstallerData) {
                        finalInstaller = { id: awardedInstallerSnap.id, ...awardedInstallerData } as User;
                    }
                }
            } catch (err) {
                console.warn("Error fetching installer:", err);
            }

            setJob({
                ...(jobData as Job),
                jobGiver: finalJobGiver,
                awardedInstaller: finalInstaller,
            });

            // Fetch Transaction if Platform Receipt requested
            if (type === 'platform') {
                try {
                    const q = query(collection(db, 'transactions'), where('jobId', '==', id));
                    const querySnapshot = await getDocs(q);
                    const validStatuses = ['Funded', 'Released', 'Completed'];
                    const validTxn = querySnapshot.docs.find(doc => validStatuses.includes(doc.data().status));

                    if (validTxn) {
                        const txnData = validTxn.data();
                        setTransaction({ id: validTxn.id, ...txnData } as Transaction);
                    }
                } catch (e) {
                    console.error("Error fetching transaction:", e);
                }
            }

            setLoading(false);
        });

        return () => unsubscribe();
    }, [id, db, type]);

    if (loading) {
        return <InvoicePageSkeleton />;
    }

    if (!job) {
        notFound();
    }

    const jobGiver = job.jobGiver as User;
    const installer = job.awardedInstaller as User; // safe if undefined, handled in check

    // Permissions Check
    // Handle case where installer is undefined (not fetched yet or legacy data)
    // Note: If user is admin, allow. If user is job giver, allow. If user is installer, allow.

    // Safety check for installer.id access
    const installerId = installer?.id;

    if (user && !isAdmin && user.id !== jobGiver.id && user.id !== installerId) {
        notFound();
    }

    // --- PLATFORM INVOICE LOGIC ---
    if (type === 'platform') {
        if (!transaction) {
            return <div className="p-8 text-center">Transaction details not found. Receipt unavailable.</div>;
        }

        const isViewerJobGiver = user ? user.id === jobGiver.id : false;
        // If viewer is admin, we probably want to see both or ask? For now, default to JobGiver view if admin, or show error?
        // Let's assume Admin is debugging, show Giver's for now or just generic.
        // Better: Use role context. If user.role matches...
        // If Admin, let's show a toggle or just Giver's by default.

        // Determine Invoice Details based on Who is Viewing
        // Invoice 2: Platform -> Installer (Commission)
        // Invoice 3: Platform -> Job Giver (Service Fee)

        let recipientName = "";
        let recipientAddress = "";
        let recipientGst = "";
        let feeDescription = "";
        let feeAmount = 0;
        let invoiceNumber = `INV-PLT-${transaction.id.slice(-6).toUpperCase()}`;

        if (user && user.id === installer.id) {
            // Invoice 2
            recipientName = installer.name;
            recipientAddress = installer.address.fullAddress || "Address not provided";
            recipientGst = installer.gstin || "";
            feeDescription = "Platform Commission Fee";
            feeAmount = transaction.commission || 0;
            invoiceNumber += "-INST";
        } else {
            // Invoice 3 (Default for Job Giver)
            recipientName = jobGiver.name;
            recipientAddress = jobGiver.address.fullAddress || "Address not provided";
            recipientGst = jobGiver.gstin || "";
            feeDescription = "Platform Service Fee";
            feeAmount = transaction.jobGiverFee || 0;
            invoiceNumber += "-JG";
        }

        const gstRate = 0.18;
        const taxAmount = feeAmount * gstRate; // Wait, usually the fee stored IN transaction includes tax?
        // Let's check INVOICE_GUIDE.md
        // "Platform Fee (5% of Bid Amount) = 500. GST on Platform Fee = 90. Total Fee = 590."
        // Transaction type in types.ts:
        // commission: number; // The platform commission amount taken from installer
        // jobGiverFee: number; // The fee charged to the job giver
        // Usually these are base amounts or total?
        // Let's assume stored values are BASE amounts for cleaner calculation, OR we need to back-calculate.
        // "commission: number; // The platform commission amount" -> In code we did `Math.ceil(amount * 0.05)`.
        // That 5% is usually inclusive or exclusive?
        // INVOICE_GUIDE says:
        // Platform Commission (5%) = 500. GST @ 18% = 90. Total = 590.
        // So the fee stored (e.g. 500) is Taxable Value. GST is extra.

        // However, `jobGiverFee` in FundingDialog was:
        // const platformFee = Math.round(subtotal * (jobGiverFeeRate / 100));
        // const total = subtotal + travelTip + platformFee;
        // Does `total` paid by Giver include TAX on that fee?
        // In the `FundingBreakdownDialog`, we just showed "Platform Fee". We didn't explicitly add GST line item THERE (Phase 1 simplistic).
        // But for INVOICE, we must show GST.
        // If we charged 500, we need to decide if that 500 INCLUDES GST or not.
        // Standard B2C/B2B: 500 + GST.
        // If our logic in checkout collected 500 total, then 500 is Inclusive.
        // Taxable = 500 / 1.18 = 423.72
        // GST = 76.27
        // Let's check `AddFundsDialog` logic:
        // fee = amount * rate; total = amount + fee.
        // It doesn't seem to add extra GST on top in the dialog.
        // So the `commission` / `jobGiverFee` stored in DB is the TOTAL collected for that purpose.
        // Thus we should treat it as INCLUSIVE of GST for the invoice to match the cash flow.

        // CORRECTION: INVOICE_GUIDE says:
        // "Total Paid by Job Giver ... Platform Fee 500 ... GST 90 ... Total 13570"
        // This implies the checkout logic SHOULD have added GST.
        // If the current code (FundingBreakdownDialog) DOES NOT add GST, then we have a discrepancy.
        // BUT, I shouldn't break the invoice based on a potential checkout bug.
        // I will stick to "Stored Amount is Taxable Value" pattern from the Guide IF the checkout supports it.
        // If checkout only charged 500, and I say "500 + 90 Tax", then we invoiced 590 but collected 500. BAD.
        // So safest bet behavior: Treat stored amount as INCLUSIVE.

        const isInclusive = true;
        const taxableAmount = isInclusive ? (feeAmount / 1.18) : feeAmount;
        const gstAmt = isInclusive ? (feeAmount - taxableAmount) : (feeAmount * 0.18);
        const totalAmount = isInclusive ? feeAmount : (feeAmount + gstAmt);

        return (
            <div className="max-w-4xl mx-auto p-4 sm:p-8 bg-background print:max-w-none">
                <div className="flex justify-between items-start mb-8">
                    <div>
                        <h1 className="text-3xl font-bold">Platform Receipt</h1>
                        <p className="text-muted-foreground">#{invoiceNumber}</p>
                    </div>
                    <div className="text-right">
                        <h2 className="text-xl font-bold text-primary">CCTV Job Connect</h2>
                        <p className="text-xs text-muted-foreground">GSTIN: 29ABCDE1234F1Z5</p>
                        <p className="text-xs text-muted-foreground">Bangalore, India</p>
                    </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-8 mb-8">
                    <div>
                        <h3 className="font-semibold mb-2">Billed To:</h3>
                        <div className="text-sm text-muted-foreground">
                            <p className="font-bold text-foreground">{recipientName}</p>
                            <p>{recipientAddress}</p>
                            {recipientGst && <p><strong>GSTIN:</strong> {recipientGst}</p>}
                        </div>
                    </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-8 mb-8 text-sm">
                    <div>
                        <h3 className="font-semibold mb-2">Date</h3>
                        <p>{format(transaction.createdAt ? toDate(transaction.createdAt) : new Date(), 'MMMM d, yyyy')}</p>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b">
                                <th className="p-2 text-left font-semibold">Description</th>
                                <th className="p-2 text-center font-semibold">SAC</th>
                                <th className="p-2 text-right font-semibold">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="border-b">
                                <td className="p-2">
                                    <p className="font-medium">{feeDescription}</p>
                                    <p className="text-xs text-muted-foreground">Ref Job: {job.title} ({job.id})</p>
                                </td>
                                <td className="p-2 text-center">9984</td>
                                <td className="p-2 text-right">₹{taxableAmount.toFixed(2)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div className="flex justify-end mt-4">
                    <div className="w-full max-w-sm space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span>Taxable Value</span>
                            <span>₹{taxableAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span>IGST @ 18%</span>
                            <span>₹{gstAmt.toFixed(2)}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between text-lg font-bold">
                            <span>Total Paid</span>
                            <span>₹{totalAmount.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                <div className="mt-8 text-center print:hidden">
                    <Button onClick={() => window.print()}>
                        <Printer className="mr-2 h-4 w-4" />
                        Print / Save as PDF
                    </Button>
                </div>
            </div>
        )
    }

    // --- SERVICE INVOICE LOGIC (Existing/Default) ---
    // (Preserve existing logic for Invoice 1)
    if (!job.invoice) {
        return <div className="p-8 text-center">Invoice not generated yet.</div>;
    }

    const { subtotal, travelTip } = job.invoice;
    const sacCode = "9954";

    // Use billingSnapshot for tax calculation to prevent "Tax Drift"
    // This ensures we use the installer's details at the time of job award
    const billingData = job.billingSnapshot || {
        installerName: installer.name,
        installerAddress: installer.address,
        gstin: installer.gstin || '',
        pan: installer.panNumber || ''
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

            <div className="space-y-4 text-xs text-muted-foreground mt-8">
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
