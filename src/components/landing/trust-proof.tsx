'use client';

import { ShieldCheck, Lock, Award } from "lucide-react";
import { useTranslations } from "next-intl";

export function TrustProofSection() {
    const t = useTranslations('landing');

    const features = [
        {
            icon: <ShieldCheck className="h-12 w-12 text-primary" />,
            title: t('trustProof.verifiedProfessionalsTitle', { defaultMessage: '100% Verified Professionals' }),
            description: t('trustProof.verifiedProfessionalsDesc', { defaultMessage: 'Every professional undergoes strict Aadhar/PAN verification before they can place a bid.' })
        },
        {
            icon: <Lock className="h-12 w-12 text-primary" />,
            title: t('trustProof.escrowTitle', { defaultMessage: 'Secure Escrow Payments' }),
            description: t('trustProof.escrowDesc', { defaultMessage: 'Funds are securely held in escrow and only released when you are 100% satisfied with the installation.' })
        },
        {
            icon: <Award className="h-12 w-12 text-primary" />,
            title: t('trustProof.guaranteeTitle', { defaultMessage: 'Platform Guarantee' }),
            description: t('trustProof.guaranteeDesc', { defaultMessage: 'Backed by our rapid dispute resolution process and robust community rating system.' })
        }
    ];

    return (
        <section className="py-32 md:py-48 bg-background border-y border-border/30">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-24">
                    <h2 className="text-4xl md:text-6xl font-black tracking-tight mb-6">
                        {t('trustProof.heading', { defaultMessage: 'Built on Trust and Security' })}
                    </h2>
                    <p className="text-muted-foreground/80 text-xl md:text-2xl max-w-3xl mx-auto leading-relaxed">
                        {t('trustProof.subheading', { defaultMessage: 'We engineered our platform to remove risk, so you can focus on getting the job done right.' })}
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-12 lg:gap-16 relative">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-4xl bg-primary/5 blur-[120px] rounded-full -z-10 pointer-events-none" />
                    {features.map((feature, idx) => (
                        <div key={idx} className="flex flex-col items-center text-center p-12 glass rounded-3xl hover:border-primary/50 transition-all duration-500 shadow-xl shadow-black/5 dark:shadow-white/5 hover:-translate-y-1 group">
                            <div className="p-6 bg-primary/10 rounded-2xl mb-8 group-hover:scale-110 transition-transform duration-500 text-primary group-hover:bg-primary group-hover:text-primary-foreground shadow-sm">
                                {feature.icon}
                            </div>
                            <h3 className="text-2xl font-bold mb-4 tracking-tight">{feature.title}</h3>
                            <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-lg">{feature.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

