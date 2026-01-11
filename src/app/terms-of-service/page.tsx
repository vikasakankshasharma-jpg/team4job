
import React from 'react';

export default function TermsPage() {
    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>
            <p className="text-muted-foreground mb-4">Last Updated: {new Date().toLocaleDateString()}</p>

            <div className="prose dark:prose-invert max-w-none space-y-6">
                <section>
                    <h2 className="text-xl font-semibold mb-2">1. Acceptance of Terms</h2>
                    <p>By accessing and using CCTV Job Connect (&quot;the Platform&quot;), you accept and agree to be bound by the terms and provision of this agreement.</p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-2">2. Description of Service</h2>
                    <p>The Platform provides a marketplace for Job Givers to post CCTV installation requirements and for verified Installers to bid on these jobs. We act as an intermediary and escrow agent but are not a party to the actual contract between Job Giver and Installer.</p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-2">3. User Obligations</h2>
                    <ul className="list-disc pl-5 space-y-1">
                        <li>You must provide accurate and complete registration information.</li>
                        <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
                        <li>Job Givers agree to fund the escrow account before work begins.</li>
                        <li>Installers agree to perform work to the standards described in their bids.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-2">4. Payments and Escrow</h2>
                    <p>All payments for jobs must be routed through the Platform&apos;s escrow system. Off-platform payments are a violation of these terms and may result in account suspension. Funds are released to the Installer only upon Job Giver approval or Dispute Resolution outcome.</p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-2">5. Disputes</h2>
                    <p>In the event of a disagreement, users agree to utilize the Platform&apos;s Dispute Resolution Center. The Platform&apos;s decision in disputes is final and binding regarding the release of escrowed funds.</p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-2">6. Limitation of Liability</h2>
                    <p>CCTV Job Connect is not liable for any direct, indirect, incidental, or consequential damages resulting from the use or inability to use the service, or for the conduct of any user on the platform.</p>
                </section>
            </div>
        </div>
    );
}
