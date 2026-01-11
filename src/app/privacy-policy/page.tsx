
import React from 'react';

export default function PrivacyPage() {
    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
            <p className="text-muted-foreground mb-4">Last Updated: {new Date().toLocaleDateString()}</p>

            <div className="prose dark:prose-invert max-w-none space-y-6">
                <section>
                    <h2 className="text-xl font-semibold mb-2">1. Information We Collect</h2>
                    <p>We collect information you provide directly to us, including:</p>
                    <ul className="list-disc pl-5 space-y-1">
                        <li>Account information (Name, Email, Phone Number).</li>
                        <li>Profile information (Skills, Experience, Locations).</li>
                        <li>Financial information (Bank Account details for payouts) - stored securely by our payment processor.</li>
                        <li>Job details and communication contents.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-2">2. How We Use Your Information</h2>
                    <p>We use your information to:</p>
                    <ul className="list-disc pl-5 space-y-1">
                        <li>Facilitate job matching and connections.</li>
                        <li>Process payments and payouts.</li>
                        <li>Verify identities to maintain platform trust.</li>
                        <li>Communicate with you about services and updates.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-2">3. Information Sharing</h2>
                    <p>We do not sell your personal data. We share information only as follows:</p>
                    <ul className="list-disc pl-5 space-y-1">
                        <li>Between Job Givers and Installers as necessary to facilitate a job.</li>
                        <li>With third-party service providers (e.g., Payment Gateways, Cloud Hosting) who assist in our operations.</li>
                        <li>As required by law or to protect rights and safety.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-2">4. Data Security</h2>
                    <p>We implement industry-standard security measures to protect your data. However, no security system is impenetrable, and we cannot guarantee the security of our databases.</p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-2">5. Your Rights</h2>
                    <p>You have the right to access, correct, or delete your personal information. You can manage most of your data directly through your Profile settings.</p>
                </section>
            </div>
        </div>
    );
}
