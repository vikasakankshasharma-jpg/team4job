
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Shield, User, Briefcase, Zap, AlertTriangle, ShieldCheck } from "lucide-react";

export function PlatformGuide() {
    return (
        <ScrollArea className="h-[60vh] pr-4">
            <Tabs defaultValue="general" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="general">Overview</TabsTrigger>
                    <TabsTrigger value="professional">For Professionals</TabsTrigger>
                    <TabsTrigger value="client">For Clients</TabsTrigger>
                </TabsList>

                {/* GENERAL OVERVIEW */}
                <TabsContent value="general" className="space-y-4 mt-4">
                    <div className="bg-muted p-4 rounded-lg border">
                        <h3 className="font-semibold flex items-center gap-2 mb-2">
                            <ShieldCheck className="h-5 w-5 text-primary" />
                            Trusted Connections
                        </h3>
                        <p className="text-sm text-muted-foreground">
                            We connect verified technical professionals with clients. Our platform uses a <strong>Secure and Lock Payment System</strong> to ensure
                            payment safety for both parties.
                        </p>
                    </div>

                    <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="escrow">
                            <AccordionTrigger>How does payment work?</AccordionTrigger>
                            <AccordionContent>
                                <div className="space-y-2 text-sm">
                                    <p>We use a safe <strong>Secure and Lock Payment Model</strong>:</p>
                                    <ol className="list-decimal pl-5 space-y-1">
                                        <li><strong>Funding:</strong> Client funds the job upfront. Money is <strong>Locked</strong> securely by the platform.</li>
                                        <li><strong>Work:</strong> Professional completes the task and uploads proof.</li>
                                        <li><strong>Release:</strong> Client verifies work and releases payment.</li>
                                        <li><strong>Auto-Settle:</strong> If a Client is unresponsive for <Badge variant="outline">5 Days</Badge> after submission, funds are auto-released to the professional.</li>
                                    </ol>
                                </div>
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="disputes">
                            <AccordionTrigger>What if there is a dispute?</AccordionTrigger>
                            <AccordionContent>
                                <div className="space-y-2 text-sm">
                                    <p>Either party can raise a dispute if issues arise.</p>
                                    <ul className="list-disc pl-5 space-y-1">
                                        <li><strong>Locking:</strong> Payments remain <strong>Locked</strong> immediately when a dispute is active.</li>
                                        <li><strong>Resolution:</strong> Our admins investigate and have the authority to refund the client or release funds to the professional based on evidence.</li>
                                    </ul>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </TabsContent>

                {/* FOR PROFESSIONALS */}
                <TabsContent value="professional" className="space-y-4 mt-4">
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 dark:bg-blue-950/20 dark:border-blue-900">
                        <h3 className="font-semibold flex items-center gap-2 mb-2 text-blue-700 dark:text-blue-400">
                            <Briefcase className="h-5 w-5" />
                            Growing Your Business
                        </h3>
                        <p className="text-sm text-blue-600 dark:text-blue-300">
                            Start as a Freelancer or verify your business to become a Pro. We support all growth stages.
                        </p>
                    </div>

                    <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="verification">
                            <AccordionTrigger>Verification Levels</AccordionTrigger>
                            <AccordionContent>
                                <div className="space-y-3 text-sm">
                                    <div>
                                        <Badge variant="secondary">Freelancer (Basic)</Badge>
                                        <p className="mt-1 text-muted-foreground">Requires Aadhar & Skill selection. Rewards <strong>50 Welcome Points</strong>.</p>
                                    </div>
                                    <div>
                                        <Badge>Pro (Silver)</Badge>
                                        <p className="mt-1 text-muted-foreground">Requires Shop Photo & GSTIN. Unlocks &quot;Pro&quot; badge and higher search ranking.</p>
                                    </div>
                                </div>
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="bidding">
                            <AccordionTrigger>Blind Bidding System</AccordionTrigger>
                            <AccordionContent>
                                <p className="text-sm text-muted-foreground">
                                    To ensure fair competition, <strong>you cannot see other professionals&apos; bid amounts</strong>, and they cannot see yours.
                                    Focus on quoting a fair price for your quality of work rather than undercutting others.
                                </p>
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="payouts">
                            <AccordionTrigger>Getting Paid</AccordionTrigger>
                            <AccordionContent>
                                <p className="text-sm text-muted-foreground">
                                    Funds are sent directly to your bank account via Cashfree Payouts immediately after the Client approves your work
                                    (or after the 5-day Auto-Settle period).
                                </p>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </TabsContent>

                {/* FOR CLIENTS */}
                <TabsContent value="client" className="space-y-4 mt-4">
                    <div className="bg-amber-50 p-4 rounded-lg border border-amber-100 dark:bg-amber-950/20 dark:border-amber-900">
                        <h3 className="font-semibold flex items-center gap-2 mb-2 text-amber-700 dark:text-amber-400">
                            <User className="h-5 w-5" />
                            Hiring Experts
                        </h3>
                        <p className="text-sm text-amber-600 dark:text-amber-300">
                            Post your requirements and get bids from verified professionals.
                        </p>
                    </div>

                    <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="posting">
                            <AccordionTrigger>How to hire?</AccordionTrigger>
                            <AccordionContent>
                                <ol className="list-decimal pl-5 space-y-2 text-sm">
                                    <li><strong>Post a Job:</strong> Use our AI wizard or manual form.</li>
                                    <li><strong>Compare Bids:</strong> Review profiles, ratings, and quotes.</li>
                                    <li><strong>Secure Deposit:</strong> Fund the <strong>Secure and Lock Deposit</strong> to start the job.</li>
                                    <li><strong>Approve:</strong> Only release payment when you are satisfied.</li>
                                </ol>
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="safety">
                            <AccordionTrigger>Is my money safe?</AccordionTrigger>
                            <AccordionContent>
                                <p className="text-sm text-muted-foreground">
                                    Yes. Your money is held in a neutral <strong>Secure and Lock</strong> account. It is <strong>never</strong> released to the professional until you approve the work
                                    or the auto-settle timer expires (5 days after submission). You can raise a dispute at any time to keep the funds <strong>Locked</strong>.
                                </p>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </TabsContent>
            </Tabs>
        </ScrollArea>
    );
}
