'use client';

import { ShieldCheck, Lock, Award } from "lucide-react";
import { useTranslations } from "next-intl";

export function TrustProofSection() {
    const t = useTranslations('landing');

    const features = [
        {
            icon: <ShieldCheck className="h-14 w-14 text-primary" />,
            title: t('trustProof.verifiedProfessionalsTitle', { defaultMessage: 'SIGNAL VERIFICATION' }),
            description: t('trustProof.verifiedProfessionalsDesc', { defaultMessage: 'Every operative undergoes rigorous Aadhar/PAN multi-channel verification before terminal access is granted.' })
        },
        {
            icon: <Lock className="h-14 w-14 text-primary" />,
            title: t('trustProof.escrowTitle', { defaultMessage: 'ESCROW CLEARANCE' }),
            description: t('trustProof.escrowDesc', { defaultMessage: 'Financial assets are neutralized in high-discretion escrow and only released upon successful mission completion.' })
        },
        {
            icon: <Award className="h-14 w-14 text-primary" />,
            title: t('trustProof.guaranteeTitle', { defaultMessage: 'NETWORK GUARANTEE' }),
            description: t('trustProof.guaranteeDesc', { defaultMessage: 'Backed by our high-authority dispute resolution protocols and robust community performance metrics.' })
        }
    ];

    return (
        <section className="py-32 md:py-48 bg-background border-y border-border/30">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-24">
                    <h2 className="text-5xl md:text-7xl font-black italic tracking-tighter uppercase mb-6 leading-none">
                        {t('trustProof.heading', { defaultMessage: 'TRUST ARCHITECTURE' })}
                    </h2>
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40 italic max-w-2xl mx-auto leading-relaxed">
                        {t('trustProof.subheading', { defaultMessage: "We've engineered the network to optimize trust, so you can execute missions with absolute confidence." })}
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-12 lg:gap-16 relative">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-5xl bg-primary/5 blur-[120px] rounded-full -z-10 pointer-events-none" />
                    {features.map((feature, idx) => (
                        <div key={idx} className="flex flex-col items-center text-center p-14 bg-surface-container-low/40 rounded-[3.5rem] ring-1 ring-white/5 shadow-2xl backdrop-blur-3xl hover:ring-primary/20 transition-all duration-700 hover:translate-y-[-10px] group">
                            <div className="p-10 bg-surface-container-low rounded-[3rem] mb-10 group-hover:scale-110 transition-all duration-700 text-primary ring-1 ring-white/10 group-hover:ring-primary/40 shadow-[0_30px_70px_-10px_rgba(0,0,0,0.5)]">
                                {feature.icon}
                            </div>
                            <h3 className="text-2xl font-black italic tracking-tighter uppercase mb-4">{feature.title}</h3>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 italic leading-relaxed">{feature.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

