"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { getInvoiceDataAction } from "@/app/actions/job.actions";
import { Job, Transaction, User } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Printer, ShieldCheck, CheckCircle2, Building2, User2, FileText, IndianRupee, Sparkles, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { toDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-user";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

function InvoicePageSkeleton() {
    return (
        <div className="max-w-4xl mx-auto p-4 sm:p-8 animate-pulse">
            <div className="h-12 bg-muted rounded-2xl w-1/3 mb-12"></div>
            <div className="grid grid-cols-2 gap-8 mb-12">
                <div className="space-y-3">
                    <div className="h-4 bg-muted rounded w-24"></div>
                    <div className="h-6 bg-muted rounded w-48"></div>
                    <div className="h-4 bg-muted rounded w-64"></div>
                </div>
                <div className="space-y-3 flex flex-col items-end">
                    <div className="h-4 bg-muted rounded w-24"></div>
                    <div className="h-6 bg-muted rounded w-48"></div>
                </div>
            </div>
            <div className="h-64 bg-muted rounded-3xl w-full"></div>
        </div>
    )
}

function InvoiceContent() {
    const params = useParams();
    const searchParams = useSearchParams();
    const t = useTranslations('invoice');
    const tCommon = useTranslations('common');
    const { toast } = useToast();
    const id = params.id as string;
    const type = searchParams.get('type');

    const [job, setJob] = useState<Job | null>(null);
    const [transaction, setTransaction] = useState<Transaction | null>(null);
    const { user, loading: userLoading } = useUser();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        queueMicrotask(() => {
            setMounted(true);
        });
    }, []);

    useEffect(() => {
        if (userLoading) return;
        if (!user) {
            queueMicrotask(() => {
                setError("Authentication required to view invoices");
                setLoading(false);
            });
            return;
        }
        if (!id) {
            queueMicrotask(() => {
                setError("No job ID provided");
                setLoading(false);
            });
            return;
        }

        let isMounted = true;
        const fetchData = async () => {
            setLoading(true);
            try {
                const res = await getInvoiceDataAction(id, user.id, type || undefined);
                if (isMounted) {
                    if (res.success && res.data) {
                        setJob(res.data.job);
                        setTransaction(res.data.transaction);
                    } else {
                        setError(res.error || "Failed to load invoice data");
                        toast({ title: tCommon('error'), description: res.error, variant: "destructive" });
                    }
                }
            } catch (err: any) {
                if (isMounted) setError("An unexpected error occurred");
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchData();
        return () => { isMounted = false; };
    }, [id, type, toast, user, userLoading, tCommon]);

    if (loading || !mounted) {
        return <div data-testid="invoice-page-container" className="min-h-screen bg-background pt-12"><InvoicePageSkeleton /></div>;
    }

    if (error || !job) {
        return (
            <div data-testid="invoice-page-container" className="min-h-screen flex items-center justify-center p-8 text-center bg-background">
                <div className="max-w-md space-y-4">
                    <div className="bg-destructive/10 p-6 rounded-full w-20 h-20 mx-auto flex items-center justify-center">
                        <ShieldCheck className="h-10 w-10 text-destructive" />
                    </div>
                    <h1 className="text-3xl font-black italic tracking-tighter uppercase">{tCommon('error')}</h1>
                    <p className="text-muted-foreground font-medium">{error || "Job not found"}</p>
                    <Button variant="outline" onClick={() => window.history.back()}>{tCommon('back')}</Button>
                </div>
            </div>
        );
    }

    const client = job.client as User;
    const isPlatform = type === 'platform';

    if (isPlatform && !transaction) {
        return <div className="p-8 text-center bg-background min-h-screen flex items-center justify-center font-medium opacity-60">Transaction details not found. Receipt unavailable.</div>;
    }

    const invoiceNumber = isPlatform 
        ? `INV-PLT-${transaction?.id?.slice(-6)?.toUpperCase() || 'XXXXXX'}-JG`
        : `INV-SVC-${transaction?.id?.slice(-6)?.toUpperCase() || 'XXXXXX'}-JG`;

    const dateStr = format(transaction?.createdAt ? toDate(transaction.createdAt) : new Date(), 'MMMM d, yyyy');

    const renderHeader = (title: string) => (
        <div className="flex flex-col sm:flex-row justify-between items-start gap-8 mb-16 print:mb-8">
            <div className="space-y-3">
                <div className="flex items-center gap-3">
                    <div className="h-4 w-4 rounded-full bg-primary animate-pulse print:hidden shadow-lg shadow-primary/20" />
                    <h1 className="text-4xl sm:text-5xl font-black italic tracking-tighter uppercase print:text-3xl bg-gradient-to-br from-foreground to-foreground/50 bg-clip-text text-transparent">
                        {title}
                    </h1>
                </div>
                <Badge variant="secondary" className="px-4 py-1.5 rounded-full font-mono text-[11px] tracking-widest uppercase bg-muted/50 border-muted/20 backdrop-blur-sm">
                    {t('txnId')}: {transaction?.id}
                </Badge>
            </div>
            <div className="text-left sm:text-right flex flex-col items-start sm:items-end">
                <div className="text-4xl font-black tracking-tighter italic text-primary drop-shadow-sm mb-1 leading-none">Team4Job</div>
                <p className="text-[11px] font-black uppercase tracking-[0.3em] opacity-40 italic">Series #{invoiceNumber}</p>
            </div>
        </div>
    );

    const renderVerifiedSeal = () => (
        <motion.div 
            initial={{ opacity: 0, scale: 0.8, rotate: -20 }}
            animate={{ opacity: 0.04, scale: 1, rotate: -12 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none print:opacity-[0.08]"
        >
            <div className="border-[16px] border-primary p-12 rounded-[5rem] flex flex-col items-center gap-6">
                <ShieldCheck className="h-64 w-64 text-primary" />
                <span className="text-8xl font-black uppercase tracking-tighter italic text-primary">VERIFIED SECURE</span>
            </div>
        </motion.div>
    );

    // --- PLATFORM RECEIPT VIEW ---
    if (isPlatform && transaction) {
        const feeAmount = transaction.clientFee || 0;
        const taxableAmount = feeAmount / 1.18;
        const gstAmt = feeAmount - taxableAmount;

        return (
            <div data-testid="invoice-page-container" className="min-h-screen bg-surface-container-lowest dark:bg-slate-950 print:bg-background pt-12 pb-20 transition-all">
                <motion.div 
                    initial={{ opacity: 0, y: 30, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.8 }}
                    className="max-w-4xl mx-auto p-12 sm:p-20 bg-surface-container-low/60 backdrop-blur-3xl print:max-w-none print:p-0 shadow-[0_32px_128px_-16px_rgba(0,0,0,0.15)] rounded-[3rem] print:rounded-none relative overflow-hidden ring-1 ring-white/10"
                >
                    <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-primary via-accent to-primary animate-gradient-x print:hidden" />
                    {renderVerifiedSeal()}
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
                        {renderHeader(t('platformReceipt'))}
                    </motion.div>

                    <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 }}
                        className="grid sm:grid-cols-2 gap-16 mb-20 print:mb-8 relative z-10"
                    >
                        <div className="space-y-6">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 flex items-center gap-2 italic">
                                <Building2 className="h-3 w-3" />
                                {t('billedTo')}
                            </h3>
                            <div className="space-y-4 bg-foreground/[0.03] p-8 rounded-[2rem] ring-1 ring-white/5">
                                <p className="text-3xl font-black italic tracking-tighter uppercase leading-none">{client?.name}</p>
                                <p className="text-sm font-semibold opacity-60 leading-relaxed max-w-xs">{client?.address?.fullAddress}</p>
                                {client?.gstin && <Badge variant="outline" className="text-[9px] font-black tracking-widest px-3 py-1 border-primary/20 bg-primary/5 text-primary">GSTIN: {client.gstin}</Badge>}
                            </div>
                        </div>
                        <div className="sm:text-right space-y-6">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 inline-flex items-center gap-2 italic justify-end">
                                {t('date')}
                                <FileText className="h-3 w-3" />
                            </h3>
                            <div className="bg-foreground/[0.03] p-8 rounded-[2rem] ring-1 ring-white/5 inline-block min-w-[200px]">
                                <p className="text-2xl font-black italic tracking-tighter text-primary">{dateStr.toUpperCase()}</p>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                        className="relative z-10 overflow-hidden rounded-[3rem] border-none bg-surface-container-high/40 backdrop-blur-xl mb-16 print:border-slate-200 print:rounded-2xl shadow-2xl ring-1 ring-white/5"
                    >
                        <table className="w-full text-left">
                            <thead className="bg-primary/5 print:bg-slate-50 border-b border-primary/10">
                                <tr>
                                    <th className="px-12 py-8 text-[11px] font-black uppercase tracking-[0.3em] opacity-40 italic">{t('description')}</th>
                                    <th className="px-12 py-8 text-[11px] font-black uppercase tracking-[0.3em] opacity-40 italic text-center uppercase">{t('sac')}</th>
                                    <th className="px-12 py-8 text-[11px] font-black uppercase tracking-[0.3em] opacity-40 italic text-right uppercase">{t('amount')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 print:divide-slate-100">
                                <tr className="group">
                                    <td className="px-12 py-16">
                                        <div className="font-black italic text-4xl mb-4 tracking-tighter uppercase leading-none shadow-sm shadow-foreground/10">System Bridge Protocol</div>
                                        <div className="text-[10px] text-primary/60 font-black uppercase tracking-[0.2em] italic bg-primary/5 px-4 py-1.5 rounded-full inline-block ring-1 ring-primary/10">
                                            {t('jobTitle')}: {job.title.toUpperCase()}
                                        </div>
                                    </td>
                                    <td className="px-12 py-16 text-center font-black italic text-2xl opacity-40 underline decoration-primary/20 underline-offset-8">9984</td>
                                    <td className="px-12 py-16 text-right font-black italic text-4xl text-primary flex items-center justify-end gap-3 tracking-tighter">
                                        <IndianRupee className="h-6 w-6 opacity-30" />
                                        {taxableAmount.toFixed(2)}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </motion.div>

                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.8 }}
                        className="flex justify-end p-10 pt-0 relative z-10"
                    >
                        <div className="w-full max-w-sm space-y-6">
                            <div className="space-y-4 bg-foreground/[0.02] p-8 rounded-[2.5rem] ring-1 ring-white/5 shadow-inner">
                                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest opacity-40 italic">
                                    <span>{t('taxableValue')}</span>
                                    <span>₹{taxableAmount.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest opacity-30 italic">
                                    <span>{t('igst')} (18% REVERSE CHARGE)</span>
                                    <span>₹{gstAmt.toFixed(2)}</span>
                                </div>
                            </div>
                            <Separator className="bg-primary/20" />
                            <div className="flex justify-between items-end px-4">
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 italic">{t('totalPaid')}</span>
                                <div className="text-6xl font-black italic tracking-tighter text-primary leading-none">₹{feeAmount.toFixed(2)}</div>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1 }}
                        className="mt-20 flex flex-col items-center gap-10 print:hidden"
                    >
                        <div className="flex items-center gap-4 text-success font-black uppercase tracking-[0.3em] text-[10px] bg-success/10 px-8 py-4 rounded-full border border-success/10 shadow-2xl backdrop-blur-md">
                            <Sparkles className="h-5 w-5 animate-pulse" />
                            {t('verifiedTransaction').toUpperCase()}
                        </div>
                        <Button 
                            onClick={() => window.print()}
                            className="h-20 px-24 rounded-[2rem] bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm uppercase tracking-[0.3em] transition-all shadow-3xl shadow-indigo-600/20 active:scale-95 flex items-center gap-6 group"
                        >
                            <Printer className="h-6 w-6 group-hover:rotate-12 transition-transform" />
                            {t('printSave')}
                            <ArrowRight className="h-6 w-6 group-hover:translate-x-3 transition-transform" />
                        </Button>
                    </motion.div>
                </motion.div>
            </div>
        );
    }

    // --- SERVICE INVOICE VIEW ---
    const professional = job.awardedProfessional as User;
    const serviceAmount = transaction?.amount || 0;

    return (
        <div data-testid="invoice-page-container" className="min-h-screen bg-surface-container-lowest dark:bg-slate-950 print:bg-background pt-12 pb-20 transition-all selection:bg-primary selection:text-white">
            <motion.div 
                initial={{ opacity: 0, y: 30, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.8 }}
                className="max-w-4xl mx-auto p-12 sm:p-20 bg-surface-container-low/60 backdrop-blur-3xl print:max-w-none print:p-0 shadow-[0_32px_128px_-16px_rgba(0,0,0,0.15)] rounded-[3rem] print:rounded-none relative overflow-hidden ring-1 ring-white/10"
            >
                <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-primary via-accent to-primary animate-gradient-x print:hidden" />
                {renderVerifiedSeal()}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
                    {renderHeader(t('serviceInvoice'))}
                </motion.div>

                <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                    className="grid sm:grid-cols-2 gap-16 mb-20 print:mb-8 relative z-10"
                >
                    <div className="space-y-6">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 flex items-center gap-2 italic">
                            <User2 className="h-3 w-3" />
                            {t('billedToClient')}
                        </h3>
                        <div className="space-y-4 bg-foreground/[0.03] p-8 rounded-[2rem] ring-1 ring-white/5">
                            <p className="text-3xl font-black italic tracking-tighter uppercase leading-none">{client?.name}</p>
                            <p className="text-sm font-semibold opacity-60 leading-relaxed max-w-xs">{client?.address?.fullAddress}</p>
                            <p className="text-[10px] font-black text-primary uppercase tracking-widest bg-primary/5 inline-block px-3 py-1 rounded-full">{client?.email}</p>
                        </div>
                    </div>
                    <div className="sm:text-right space-y-6">
                         <h3 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 inline-flex items-center gap-2 italic justify-end">
                            {t('payableTo')}
                            <Building2 className="h-3 w-3" />
                        </h3>
                        <div className="space-y-4 bg-foreground/[0.03] p-8 rounded-[2rem] ring-1 ring-white/5 inline-block text-left sm:text-right min-w-[280px]">
                            <p className="text-3xl font-black italic tracking-tighter uppercase leading-none">{professional?.name || "REDACTED"}</p>
                            <p className="text-sm font-semibold opacity-60 leading-relaxed ml-auto max-w-xs">{professional?.address?.fullAddress}</p>
                            <div className="text-[10px] font-black text-primary uppercase tracking-widest bg-primary/5 inline-block px-3 py-1 rounded-full">{dateStr.toUpperCase()}</div>
                        </div>
                    </div>
                </motion.div>

                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="relative z-10 overflow-hidden rounded-[3rem] border-none bg-surface-container-high/40 backdrop-blur-xl mb-16 print:border-slate-200 print:rounded-2xl shadow-2xl ring-1 ring-white/5"
                >
                    <table className="w-full text-left">
                        <thead className="bg-primary/5 print:bg-slate-50 border-b border-primary/10">
                            <tr>
                                <th className="px-12 py-8 text-[11px] font-black uppercase tracking-[0.3em] opacity-40 italic">{t('description')}</th>
                                <th className="px-12 py-8 text-[11px] font-black uppercase tracking-[0.3em] opacity-40 italic text-right uppercase">{t('amount')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 print:divide-slate-100">
                            <tr>
                                <td className="px-12 py-16">
                                    <div className="font-black italic text-5xl mb-4 tracking-tighter uppercase bg-gradient-to-br from-foreground to-foreground/50 bg-clip-text text-transparent">{t('serviceInvoice')}</div>
                                    <div className="text-[10px] text-primary/60 font-black uppercase tracking-[0.2em] italic bg-primary/5 px-4 py-1.5 rounded-full inline-block ring-1 ring-primary/10">
                                        {t('jobTitle')}: {job.title.toUpperCase()}
                                    </div>
                                </td>
                                <td className="px-12 py-16 text-right font-black italic text-5xl flex items-center justify-end gap-3 tracking-tighter text-primary">
                                    <IndianRupee className="h-8 w-8 opacity-30" />
                                    {serviceAmount.toFixed(2)}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </motion.div>

                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    className="flex justify-end p-10 pt-0 relative z-10"
                >
                    <div className="w-full max-w-sm space-y-6">
                        <Separator className="bg-primary/20" />
                        <div className="flex justify-between items-end px-4">
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 italic">{t('totalPaid')}</span>
                            <div className="text-7xl font-black italic tracking-tighter text-primary leading-none">₹{serviceAmount.toFixed(2)}</div>
                        </div>
                    </div>
                </motion.div>

                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1 }}
                    className="mt-20 flex flex-col items-center gap-10 print:hidden"
                >
                    <div className="flex items-center gap-4 text-primary font-black uppercase tracking-[0.3em] text-[10px] bg-primary/5 px-8 py-4 rounded-full border border-primary/10 shadow-2xl backdrop-blur-md">
                        <Sparkles className="h-5 w-5 animate-pulse" />
                        {t('verifiedTransaction').toUpperCase()}
                        <CheckCircle2 className="h-5 w-5 text-success" />
                    </div>
                    <Button 
                        onClick={() => window.print()}
                        className="h-20 px-24 rounded-[2rem] bg-slate-950 text-white font-black text-sm uppercase tracking-[0.3em] transition-all shadow-3xl shadow-slate-950/20 active:scale-95 flex items-center gap-6 group"
                    >
                        <Printer className="h-6 w-6 group-hover:rotate-12 transition-transform" />
                        {t('printSave')}
                        <ArrowRight className="h-6 w-6 group-hover:translate-x-3 transition-transform" />
                    </Button>
                </motion.div>
            </motion.div>
        </div>
    );
}

export default function InvoicePage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-background pt-12"><InvoicePageSkeleton /></div>}>
            <InvoiceContent />
        </Suspense>
    );
}
