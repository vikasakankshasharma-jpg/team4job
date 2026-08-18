import type { Metadata } from 'next';
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { CircleDollarSign, ShieldCheck } from "lucide-react";
import { LegalPageWrapper } from "@/components/landing/legal-page-wrapper";

export const metadata: Metadata = {
    title: 'Refund & Cancellation Policy | Team4Job',
    description: 'Refund and cancellation policy for Team4Job platform - escrow-based job marketplace.',
};

export default function RefundPolicyPage() {
    return (
        <LegalPageWrapper>
            <div className="container mx-auto px-4 py-12 max-w-4xl">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center p-3 sm:p-4 bg-primary/10 rounded-full mb-4 sm:mb-6">
                        <CircleDollarSign className="h-8 w-8 sm:h-12 sm:w-12 text-primary" />
                    </div>
                    <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4 text-foreground">Refund &amp; Cancellation Policy</h1>
                    <p className="text-muted-foreground text-sm sm:text-base font-medium">Last Updated: January 12, 2026</p>
                </div>

                <Card className="border-0 shadow-2xl shadow-primary/5 bg-card/50 backdrop-blur-sm overflow-hidden text-sm sm:text-base">
                    <div className="h-2 w-full bg-gradient-to-r from-primary to-accent" />
                    <CardContent className="p-6 sm:p-10 lg:p-12">
                        <div className="prose dark:prose-invert max-w-none space-y-8 prose-headings:font-bold prose-headings:tracking-tight prose-p:text-muted-foreground prose-p:leading-relaxed prose-li:text-muted-foreground">
                            <p className="text-muted-foreground leading-relaxed">
                                This platform operates as an escrow-based marketplace connecting Clients with independent Professionals.
                                All payments are held securely in escrow until job completion. This policy governs refunds
                                and cancellations for both parties.
                            </p>

                            <section className="space-y-3">
                                <h2 className="text-2xl text-foreground flex items-center gap-2"><span className="text-primary">1.</span> Escrow Payment System</h2>
                                <p>
                                    When a Client funds a job, the payment is held in a secure escrow account managed by
                                    our payment partner. Funds are only released to the Professional upon successful
                                    job completion and Client approval.
                                </p>
                            </section>

                            <section className="space-y-3">
                                <h2 className="text-2xl text-foreground flex items-center gap-2"><span className="text-primary">2.</span> Client Cancellations &amp; Refunds</h2>
                                <div className="space-y-4">
                                    <div className="p-4 bg-muted/50 rounded-lg border border-border/50">
                                        <h3 className="text-lg font-bold text-foreground mb-2">2.1 Before Professional Acceptance</h3>
                                        <ul className="list-disc pl-6 space-y-1 marker:text-primary">
                                            <li><strong>Full Refund:</strong> 100% refund minus payment gateway charges (2-3%).</li>
                                            <li><strong>Processing Time:</strong> 5-7 business days to original method.</li>
                                        </ul>
                                    </div>
                                    <div className="p-4 bg-muted/50 rounded-lg border border-border/50">
                                        <h3 className="text-lg font-bold text-foreground mb-2">2.2 After Professional Acceptance</h3>
                                        <ul className="list-disc pl-6 space-y-1 marker:text-primary">
                                            <li><strong>Mutual Cancellation:</strong> Both parties must agree.</li>
                                            <li><strong>Service Fee:</strong> Platform fee (5-10%) is non-refundable.</li>
                                        </ul>
                                    </div>
                                </div>
                            </section>

                            <section className="space-y-3">
                                <h2 className="text-2xl text-foreground flex items-center gap-2"><span className="text-primary">3.</span> Professional Cancellations</h2>
                                <ul className="list-disc pl-6 space-y-2 marker:text-primary">
                                    <li><strong>Before Acceptance:</strong> Professionals can decline without penalty.</li>
                                    <li><strong>After Acceptance:</strong> May impact reputation score; full refund to Client (minus gateway charges).</li>
                                    <li><strong>Partial Work:</strong> If mutual agreement is reached, partial payment may be awarded.</li>
                                </ul>
                            </section>

                            <section className="space-y-3">
                                <h2 className="text-2xl text-foreground flex items-center gap-2"><span className="text-primary">4.</span> Dispute Resolution</h2>
                                <p>
                                    If either party is dissatisfied and cannot reach mutual agreement, they must raise a dispute within the platform. Our support team will review evidence and make a final, binding decision within 3-5 business days.
                                </p>
                            </section>

                            <section className="space-y-3">
                                <h2 className="text-2xl text-foreground flex items-center gap-2"><span className="text-primary">5.</span> Auto-Settlement Protection</h2>
                                <p>
                                    To protect Professionals, if a Client fails to approve or reject completed work within <strong>5 days</strong>, funds are automatically released to the Professional.
                                </p>
                            </section>

                            <section className="space-y-3 text-center pt-8 border-t border-border">
                                <p className="text-base font-medium text-foreground">Questions about refunds?</p>
                                <p className="text-sm text-muted-foreground flex items-center justify-center gap-2 mt-2">
                                    <ShieldCheck className="h-4 w-4 text-primary" />
                                    Contact support at <a href="mailto:support@team4job.com" className="text-primary font-bold hover:underline">support@team4job.com</a>
                                </p>
                            </section>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </LegalPageWrapper>
    );
}
