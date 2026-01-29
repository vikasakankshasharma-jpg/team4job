// Temporary simplified invoice page to fix E2E test
"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams, notFound } from "next/navigation";
import { Suspense } from "react";
import { getInvoiceDataAction } from "@/app/actions/job.actions";
import { Job, Transaction, User } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Printer } from "lucide-react";
import { format } from "date-fns";
import { toDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

function InvoicePageSkeleton() {
    return (
        <div className="max-w-4xl mx-auto p-4 sm:p-8 animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="space-y-4">
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
        </div>
    )
}

function InvoiceContent() {
    const params = useParams();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const id = params.id as string;
    const type = searchParams.get('type');

    const [job, setJob] = useState<Job | null>(null);
    const [transaction, setTransaction] = useState<Transaction | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [clientLog, setClientLog] = useState<string[]>([]);

    // Expose logs to window for E2E debugging
    useEffect(() => {
        if (typeof window !== 'undefined') {
            (window as any).__invoicePageLogs = clientLog;
        }
    }, [clientLog]);

    const log = useCallback((msg: string) => {
        const timestamp = new Date().toISOString();
        const logMsg = `[${timestamp}] ${msg}`;
        console.log('[InvoicePage-Simple]', msg);
        setClientLog(prev => [...prev, logMsg]);
    }, []);

    useEffect(() => {
        log(`useEffect triggered - id: ${id}, type: ${type}`);
        if (!id) {
            log('ERROR: No job ID provided');
            setError("No job ID provided");
            setLoading(false);
            return;
        }

        let mounted = true;

        const fetchData = async () => {
            log('Starting fetchData');
            setLoading(true);
            const fetchStart = Date.now();

            try {
                log('Calling getInvoiceDataAction...');
                const res = await getInvoiceDataAction(id, '', type || undefined);
                log(`getInvoiceDataAction returned in ${Date.now() - fetchStart}ms`);
                log(`Response: success=${res.success}, error=${res.error}, hasData=${!!res.data}`);

                if (mounted) {
                    if (res.success && res.data) {
                        log('Data loaded successfully');
                        log(`Job: ${res.data.job?.id}, Transaction: ${res.data.transaction?.id || 'null'}`);
                        setJob(res.data.job);
                        setTransaction(res.data.transaction);
                    } else {
                        log(`ERROR from action: ${res.error}`);
                        setError(res.error || "Failed to load invoice data");
                        toast({ title: "Error", description: res.error, variant: "destructive" });
                    }
                }
            } catch (err: any) {
                log(`EXCEPTION: ${err.message}`);
                log(`Stack: ${err.stack}`);
                if (mounted) setError("An unexpected error occurred");
            } finally {
                if (mounted) {
                    log(`Fetch complete, total time: ${Date.now() - fetchStart}ms, setting loading=false`);
                    setLoading(false);
                }
            }
        };

        fetchData();
        return () => {
            log('Component unmounting');
            mounted = false;
        };
    }, [id, type, toast, log]);

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto p-8" data-testid="invoice-loading-state">
                <div className="text-4xl font-bold text-blue-600 mb-4">LOADING INVOICE PAGE...</div>
                <div className="mb-4 p-4 bg-gray-100 text-xs font-mono max-h-40 overflow-auto">
                    {clientLog.map((log, i) => <div key={i}>{log}</div>)}
                </div>
                <InvoicePageSkeleton />
            </div>
        );
    }

    if (error || !job) {
        return (
            <div className="p-8 text-center" data-testid="invoice-error-state">
                <div className="text-6xl font-bold text-red-600 mb-4">ERROR!</div>
                <div className="text-2xl text-red-500 mb-4">{error || "Job not found"}</div>
                <div className="text-xl mb-4">hasJob: {String(!!job)}</div>
                <div className="mt-8 p-4 bg-gray-100 text-left text-xs font-mono max-w-2xl mx-auto max-h-60 overflow-auto">
                    <strong>Client Logs:</strong>
                    {clientLog.map((log, i) => <div key={i}>{log}</div>)}
                </div>
            </div>
        );
    }

    const jobGiver = job.jobGiver as User;

    // PLATFORM RECEIPT
    if (type === 'platform') {
        if (!transaction) {
            return (
                <div className="p-8 text-center">
                    <p>Transaction details not found. Receipt unavailable.</p>
                </div>
            );
        }

        const recipientName = jobGiver.name;
        const recipientAddress = jobGiver.address?.fullAddress || "";
        const recipientGst = jobGiver.gstin || "";
        const feeDescription = "Platform Service Fee";
        const feeAmount = transaction.jobGiverFee || 0;
        const invoiceNumber = `INV-PLT-${transaction.id?.slice(-6)?.toUpperCase() || 'XXXXXX'}-JG`;

        const isInclusive = true;
        const taxableAmount = isInclusive ? (feeAmount / 1.18) : feeAmount;
        const gstAmt = isInclusive ? (feeAmount - taxableAmount) : (feeAmount * 0.18);
        const totalAmount = isInclusive ? feeAmount : (feeAmount + gstAmt);

        return (
            <div className="max-w-4xl mx-auto p-4 sm:p-8 bg-background print:max-w-none">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold" data-testid="platform-receipt-heading">Platform Receipt</h1>
                    <Badge variant="outline">TXN: {transaction.id}</Badge>
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
                    <div className="sm:text-right">
                        <h2 className="text-xl font-bold text-primary">CCTV Job Connect</h2>
                        <p className="text-xs text-muted-foreground font-semibold">#{invoiceNumber}</p>
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

                {/* Debug output at bottom */}
                <div className="mt-8 p-4 bg-gray-100 text-left text-xs font-mono max-h-60 overflow-auto print:hidden">
                    <div className="font-bold mb-2">Debug Logs:</div>
                    {clientLog.map((log, i) => <div key={i}>{log}</div>)}
                </div>
            </div>
        );
    }

    // SERVICE INVOICE
    if (!transaction) {
        return (
            <div className="p-8 text-center">
                <p>Transaction details not found. Service Invoice unavailable.</p>
            </div>
        );
    }

    const jobGiverName = jobGiver?.name || "Job Giver";
    const jobGiverAddress = jobGiver?.address?.fullAddress || "";
    const jobGiverEmail = jobGiver?.email || "";

    const installer = job.awardedInstaller as User;
    const installerName = installer?.name || "Installer";
    const installerAddress = installer?.address?.fullAddress || "";
    const installerEmail = installer?.email || "";

    const invoiceNumber = `INV-SVC-${transaction.id?.slice(-6)?.toUpperCase() || 'XXXXXX'}-JG`;
    const serviceAmount = transaction.amount || 0;

    return (
        <div className="max-w-4xl mx-auto p-4 sm:p-8 bg-background print:max-w-none">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Service Invoice</h1>
                <Badge variant="outline">TXN: {transaction.id}</Badge>
            </div>

            <div className="grid sm:grid-cols-2 gap-8 mb-8">
                <div>
                    <h3 className="font-semibold mb-2">Billed To (Job Giver):</h3>
                    <div className="text-sm text-muted-foreground">
                        <p className="font-bold text-foreground">{jobGiverName}</p>
                        <p>{jobGiverAddress}</p>
                        <p>{jobGiverEmail}</p>
                    </div>
                </div>
                <div className="sm:text-right">
                    <h3 className="font-semibold mb-2">Payable To (Installer):</h3>
                    <div className="text-sm text-muted-foreground">
                        <p className="font-bold text-foreground">{installerName}</p>
                        <p>{installerAddress}</p>
                        <p>{installerEmail}</p>
                    </div>
                    <div className="mt-4">
                        <p className="text-xs text-muted-foreground font-semibold">#{invoiceNumber}</p>
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
                            <th className="p-2 text-right font-semibold">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr className="border-b">
                            <td className="p-2">
                                <p className="font-medium">Service Charges for: {job.title}</p>
                                <p className="text-xs text-muted-foreground">Job ID: {job.id}</p>
                            </td>
                            <td className="p-2 text-right">₹{serviceAmount.toFixed(2)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div className="flex justify-end mt-4">
                <div className="w-full max-w-sm flex justify-between text-lg font-bold">
                    <span>Total Paid</span>
                    <span>₹{serviceAmount.toFixed(2)}</span>
                </div>
            </div>

            <div className="mt-8 text-center print:hidden">
                <Button onClick={() => window.print()}>
                    <Printer className="mr-2 h-4 w-4" />
                    Print / Save as PDF
                </Button>
            </div>

            {/* Debug output at bottom */}
            <div className="mt-8 p-4 bg-gray-100 text-left text-xs font-mono max-h-60 overflow-auto print:hidden">
                <div className="font-bold mb-2">Debug Logs:</div>
                {clientLog.map((log, i) => <div key={i}>{log}</div>)}
            </div>
        </div>
    );
}

export default function InvoicePage() {
    return (
        <Suspense fallback={<InvoicePageSkeleton />}>
            <InvoiceContent />
        </Suspense>
    );
}
