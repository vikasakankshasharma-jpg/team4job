import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Refund & Cancellation Policy | Team4Job',
    description: 'Refund and cancellation policy for Team4Job platform - escrow-based job marketplace.',
};

export default function RefundPolicyPage() {
    return (
        <div className="min-h-screen bg-background">
            <div className="container max-w-4xl py-12 px-4">
                <h1 className="text-4xl font-bold mb-8">Refund & Cancellation Policy</h1>

                <div className="prose prose-slate dark:prose-invert max-w-none space-y-6">
                    <p className="text-muted-foreground">
                        <strong>Effective Date:</strong> January 12, 2026<br />
                        <strong>Last Updated:</strong> January 12, 2026
                    </p>

                    <section>
                        <h2 className="text-2xl font-semibold mt-8 mb-4">1. Overview</h2>
                        <p>
                            Team4Job operates as an escrow-based marketplace connecting Clients with Professionals.
                            All payments are held securely in escrow until job completion. This policy governs refunds
                            and cancellations for both parties.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold mt-8 mb-4">2. Escrow Payment System</h2>
                        <p>
                            When a Client funds a job, the payment is held in a secure escrow account managed by
                            our payment partner (Cashfree). Funds are only released to the Professional upon successful
                            job completion and Client approval.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold mt-8 mb-4">3. Client Cancellations & Refunds</h2>

                        <h3 className="text-xl font-semibold mt-6 mb-3">3.1 Before Professional Acceptance</h3>
                        <ul className="list-disc pl-6 space-y-2">
                            <li><strong>Full Refund:</strong> If you cancel before a Professional accepts the job, you will receive a 100% refund minus payment gateway charges (typically 2-3%).</li>
                            <li><strong>Processing Time:</strong> 5-7 business days to your original payment method.</li>
                        </ul>

                        <h3 className="text-xl font-semibold mt-6 mb-3">3.2 After Professional Acceptance</h3>
                        <ul className="list-disc pl-6 space-y-2">
                            <li><strong>Mutual Cancellation:</strong> Both parties must agree. Refund amount depends on work completed.</li>
                            <li><strong>Unilateral Cancellation:</strong> May result in partial payment to Professional based on dispute resolution.</li>
                            <li><strong>Service Fee:</strong> Platform service fee (5-10%) is non-refundable after Professional acceptance.</li>
                        </ul>

                        <h3 className="text-xl font-semibold mt-6 mb-3">3.3 After Work Completion</h3>
                        <ul className="list-disc pl-6 space-y-2">
                            <li><strong>No Refund:</strong> Once you approve work completion, funds are released to the Professional and no refund is possible.</li>
                            <li><strong>Dispute Process:</strong> If you believe work is unsatisfactory, raise a dispute before approving completion.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold mt-8 mb-4">4. Professional Cancellations</h2>

                        <h3 className="text-xl font-semibold mt-6 mb-3">4.1 Before Acceptance</h3>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Professionals can decline jobs without penalty before accepting.</li>
                        </ul>

                        <h3 className="text-xl font-semibold mt-6 mb-3">4.2 After Acceptance</h3>
                        <ul className="list-disc pl-6 space-y-2">
                            <li><strong>Reputation Impact:</strong> Cancelling after acceptance may affect your reputation score.</li>
                            <li><strong>Client Refund:</strong> Full refund is issued to the Client minus gateway charges.</li>
                            <li><strong>Account Suspension:</strong> Repeated cancellations may result in account suspension.</li>
                        </ul>

                        <h3 className="text-xl font-semibold mt-6 mb-3">4.3 Partial Work Completed</h3>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>If mutual agreement is reached, you may receive payment for work completed.</li>
                            <li>Both parties must agree on the partial payment amount.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold mt-8 mb-4">5. Dispute Resolution</h2>
                        <p>
                            If either party is dissatisfied and cannot reach mutual agreement:
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li><strong>Raise a Dispute:</strong> Use the platform&apos;s dispute resolution system.</li>
                            <li><strong>Evidence Required:</strong> Submit photos, videos, chat logs, and other proof.</li>
                            <li><strong>Admin Review:</strong> Our support team will review within 3-5 business days.</li>
                            <li><strong>Final Decision:</strong> Admin decision is binding and funds will be released accordingly.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold mt-8 mb-4">6. Auto-Settlement Protection</h2>
                        <p>
                            To protect Professionals from non-responsive Clients:
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>If Client fails to approve/reject completed work within <strong>5 days</strong>, funds are automatically released to the Professional.</li>
                            <li>Clients receive multiple reminder notifications before auto-settlement.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold mt-8 mb-4">7. Funding Deadline</h2>
                        <p>
                            After Professional accepts a job:
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Client has <strong>48 hours</strong> to fund the escrow account.</li>
                            <li>Failure to fund within 48 hours results in automatic job cancellation.</li>
                            <li>No refund is applicable (no payment was made).</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold mt-8 mb-4">8. Platform Service Fees</h2>
                        <p>
                            Team4Job charges service fees to maintain the platform:
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li><strong>Professional Commission:</strong> 10% deducted from payout (configurable by admin).</li>
                            <li><strong>Client Fee:</strong> Small platform fee may apply.</li>
                            <li><strong>Non-Refundable:</strong> Service fees are non-refundable after Professional acceptance, even if job is cancelled.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold mt-8 mb-4">9. Payment Gateway Charges</h2>
                        <p>
                            Payment processing fees charged by Cashfree (our payment partner):
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li><strong>Typical Rate:</strong> 2-3% of transaction amount.</li>
                            <li><strong>Non-Refundable:</strong> These are third-party charges and cannot be refunded by Team4Job.</li>
                            <li><strong>Refund Deduction:</strong> Gateway charges are deducted from any refund amount.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold mt-8 mb-4">10. Refund Processing Time</h2>
                        <p>
                            Once a refund is approved:
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li><strong>Escrow to Payment Gateway:</strong> 1-2 business days.</li>
                            <li><strong>Payment Gateway to Bank:</strong> 5-7 business days.</li>
                            <li><strong>Total Time:</strong> Approximately 7-10 business days from approval.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold mt-8 mb-4">11. Exceptions & Force Majeure</h2>
                        <p>
                            Refunds may be handled differently in cases of:
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Natural disasters</li>
                            <li>Government restrictions</li>
                            <li>Medical emergencies (with documentation)</li>
                            <li>Platform technical failures (full refund provided)</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold mt-8 mb-4">12. Contact for Refund Queries</h2>
                        <p>
                            For refund or cancellation assistance:
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li><strong>Email:</strong> support@team4job.com</li>
                            <li><strong>In-App Support:</strong> Use the &quot;Help&quot; button in your dashboard</li>
                            <li><strong>Response Time:</strong> Within 24-48 hours</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold mt-8 mb-4">13. Policy Updates</h2>
                        <p>
                            This refund policy may be updated from time to time. Changes will be effective upon posting
                            to this page. Continued use of the platform after changes constitutes acceptance of the
                            updated policy.
                        </p>
                    </section>

                    <section className="mt-12 p-6 bg-muted rounded-lg">
                        <h2 className="text-xl font-semibold mb-3">Questions?</h2>
                        <p>
                            If you have questions about our refund and cancellation policy, please contact us at{' '}
                            <a href="mailto:support@team4job.com" className="text-primary hover:underline">
                                support@team4job.com
                            </a>
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
}
