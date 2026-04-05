import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { ShieldAlert } from "lucide-react";
import { LegalPageWrapper } from "@/components/landing/legal-page-wrapper";

export default function TermsPage() {
    return (
        <LegalPageWrapper>
            <div className="container mx-auto px-4 py-12 max-w-4xl">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center p-3 sm:p-4 bg-primary/10 rounded-full mb-4 sm:mb-6">
                        <ShieldAlert className="h-8 w-8 sm:h-12 sm:w-12 text-primary" />
                    </div>
                    <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4 text-foreground">Terms of Service</h1>
                    <p className="text-muted-foreground text-sm sm:text-base font-medium">Last Updated: {new Date().toLocaleDateString()}</p>
                </div>

                <Card className="border-0 shadow-2xl shadow-primary/5 bg-card/50 backdrop-blur-sm overflow-hidden">
                    <div className="h-2 w-full bg-gradient-to-r from-primary to-accent" />
                    <CardContent className="p-6 sm:p-10 lg:p-12">
                        <div className="prose dark:prose-invert max-w-none space-y-8 prose-headings:font-bold prose-headings:tracking-tight prose-p:text-muted-foreground prose-p:leading-relaxed prose-li:text-muted-foreground">
                            <section className="space-y-3">
                                <h2 className="text-2xl text-foreground flex items-center gap-2"><span className="text-primary">1.</span> Acceptance of Terms</h2>
                                <p className="text-base sm:text-lg">By accessing and using Team4Job (&quot;the Platform&quot;), you accept and agree to be bound by the terms and provision of this agreement.</p>
                            </section>

                            <section className="space-y-3">
                                <h2 className="text-2xl text-foreground flex items-center gap-2"><span className="text-primary">2.</span> Description of Service</h2>
                                <p className="text-base">The Platform provides a marketplace for Clients to post technical service requirements and for verified Professionals to bid on these jobs. We act as an intermediary and escrow agent but are not a party to the actual contract between Client and Professional.</p>
                            </section>

                            <section className="space-y-3">
                                <h2 className="text-2xl text-foreground flex items-center gap-2"><span className="text-primary">3.</span> User Obligations</h2>
                                <ul className="list-disc pl-6 space-y-2 text-base marker:text-primary">
                                    <li>You must provide accurate and complete registration information.</li>
                                    <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
                                    <li>Clients agree to fund the escrow account before work begins.</li>
                                    <li>Professionals agree to perform work to the standards described in their bids.</li>
                                </ul>
                            </section>

                            <section className="space-y-3">
                                <h2 className="text-2xl text-foreground flex items-center gap-2"><span className="text-primary">4.</span> Payments and Escrow</h2>
                                <p className="text-base">All payments for jobs must be routed through the Platform&apos;s escrow system. Off-platform payments are a violation of these terms and may result in account suspension. Funds are released to the Professional only upon Client approval or Dispute Resolution outcome.</p>
                            </section>

                            <section className="space-y-3">
                                <h2 className="text-2xl text-foreground flex items-center gap-2"><span className="text-primary">5.</span> Disputes</h2>
                                <p className="text-base">In the event of a disagreement, users agree to utilize the Platform&apos;s Dispute Resolution Center. The Platform&apos;s decision in disputes is final and binding regarding the release of escrowed funds.</p>
                            </section>

                            <section className="space-y-3">
                                <h2 className="text-2xl text-foreground flex items-center gap-2"><span className="text-primary">6.</span> Limitation of Liability</h2>
                                <p className="text-base">Team4Job is not liable for any direct, indirect, incidental, or consequential damages resulting from the use or inability to use the service, or for the conduct of any user on the platform.</p>
                            </section>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </LegalPageWrapper>
    );
}
