import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { ShieldCheck } from "lucide-react";
import { LegalPageWrapper } from "@/components/landing/legal-page-wrapper";

export default function PrivacyPage() {
    return (
        <LegalPageWrapper>
            <div className="container mx-auto px-4 py-12 max-w-4xl">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center p-3 sm:p-4 bg-primary/10 rounded-full mb-4 sm:mb-6">
                        <ShieldCheck className="h-8 w-8 sm:h-12 sm:w-12 text-primary" />
                    </div>
                    <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4 text-foreground">Privacy Policy</h1>
                    <p className="text-muted-foreground text-sm sm:text-base font-medium">Last Updated: {new Date().toLocaleDateString()}</p>
                </div>

                <Card className="border-0 shadow-2xl shadow-primary/5 bg-card/50 backdrop-blur-sm overflow-hidden">
                    <div className="h-2 w-full bg-gradient-to-r from-primary to-accent" />
                    <CardContent className="p-6 sm:p-10 lg:p-12">
                        <div className="prose dark:prose-invert max-w-none space-y-8 prose-headings:font-bold prose-headings:tracking-tight prose-p:text-muted-foreground prose-p:leading-relaxed prose-li:text-muted-foreground">
                            <section className="space-y-3">
                                <h2 className="text-2xl text-foreground flex items-center gap-2"><span className="text-primary">1.</span> Information We Collect</h2>
                                <p className="text-base sm:text-lg">We collect information you provide directly to us, including:</p>
                                <ul className="list-disc pl-6 space-y-2 text-base marker:text-primary">
                                    <li>Account information (Name, Email, Phone Number).</li>
                                    <li>Profile information (Skills, Experience, Locations).</li>
                                    <li>Financial information (Bank Account details for payouts) - stored securely by our payment processor.</li>
                                    <li>Job details and communication contents.</li>
                                </ul>
                            </section>

                            <section className="space-y-3">
                                <h2 className="text-2xl text-foreground flex items-center gap-2"><span className="text-primary">2.</span> How We Use Your Information</h2>
                                <p className="text-base">We use your information to:</p>
                                <ul className="list-disc pl-6 space-y-2 text-base marker:text-primary">
                                    <li>Facilitate job matching and connections.</li>
                                    <li>Process payments and payouts.</li>
                                    <li>Verify identities to maintain platform trust.</li>
                                    <li>Communicate with you about services and updates.</li>
                                </ul>
                            </section>

                            <section className="space-y-3">
                                <h2 className="text-2xl text-foreground flex items-center gap-2"><span className="text-primary">3.</span> Information Sharing</h2>
                                <p className="text-base">We do not sell your personal data. We share information only as follows:</p>
                                <ul className="list-disc pl-6 space-y-2 text-base marker:text-primary">
                                    <li>Between Clients and Professionals as necessary to facilitate a job.</li>
                                    <li>With third-party service providers (e.g., Payment Gateways, Cloud Hosting) who assist in our operations.</li>
                                    <li>As required by law or to protect rights and safety.</li>
                                </ul>
                            </section>

                            <section className="space-y-3">
                                <h2 className="text-2xl text-foreground flex items-center gap-2"><span className="text-primary">4.</span> Data Security</h2>
                                <p className="text-base">We implement industry-standard security measures to protect your data. However, no security system is impenetrable, and we cannot guarantee the security of our databases.</p>
                            </section>

                            <section className="space-y-3">
                                <h2 className="text-2xl text-foreground flex items-center gap-2"><span className="text-primary">5.</span> Your Rights (DPDP Act 2023)</h2>
                                <p className="text-base">In accordance with the Digital Personal Data Protection Act 2023 (India), you have the right to:</p>
                                <ul className="list-disc pl-6 space-y-2 text-base marker:text-primary">
                                    <li>Access information about the processing of your data.</li>
                                    <li>Correct, complete, or update your personal data.</li>
                                    <li>Withdraw consent and request erasure of your data.</li>
                                    <li>Grievance redressal regarding data handling.</li>
                                </ul>
                                <div className="mt-6 p-4 bg-muted/50 rounded-lg border border-border/50">
                                    <p className="text-sm font-medium text-foreground italic flex items-center gap-2">
                                        <ShieldCheck className="h-4 w-4 text-primary" />
                                        You can export your data or deactivate your account directly from your Dashboard Settings.
                                    </p>
                                </div>
                            </section>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </LegalPageWrapper>
    );
}
