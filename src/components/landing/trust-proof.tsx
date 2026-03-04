'use client';

import { ShieldCheck, Lock, Award } from "lucide-react";
import { useTranslations } from "next-intl";

export function TrustProofSection() {
    const t = useTranslations('landing');

    const features = [
        {
            icon: <ShieldCheck className="h-10 w-10 text-primary mb-4" />,
            title: t('trustProof.verifiedInstallersTitle', { defaultMessage: '100% Verified Installers' }),
            description: t('trustProof.verifiedInstallersDesc', { defaultMessage: 'Every installer undergoes strict Aadhar/PAN verification before they can place a bid.' })
        },
        {
            icon: <Lock className="h-10 w-10 text-primary mb-4" />,
            title: t('trustProof.escrowTitle', { defaultMessage: 'Secure Escrow Payments' }),
            description: t('trustProof.escrowDesc', { defaultMessage: 'Funds are securely held in escrow and only released when you are 100% satisfied with the installation.' })
        },
        {
            icon: <Award className="h-10 w-10 text-primary mb-4" />,
            title: t('trustProof.guaranteeTitle', { defaultMessage: 'Platform Guarantee' }),
            description: t('trustProof.guaranteeDesc', { defaultMessage: 'Backed by our rapid dispute resolution process and robust community rating system.' })
        }
    ];

    return (
        <section className="py-20 md:py-24 bg-muted/30 border-y">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                        {t('trustProof.heading', { defaultMessage: 'Built on Trust and Security' })}
                    </h2>
                    <p className="text-muted-foreground mt-4 max-w-2xl mx-auto text-lg">
                        {t('trustProof.subheading', { defaultMessage: 'We engineered our platform to remove risk, so you can focus on getting the job done right.' })}
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-10 lg:gap-16">
                    {features.map((feature, idx) => (
                        <div key={idx} className="flex flex-col items-center text-center p-6 bg-background rounded-2xl shadow-sm border">
                            <div className="p-4 bg-primary/5 rounded-full mb-2">
                                {feature.icon}
                            </div>
                            <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                            <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{feature.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

