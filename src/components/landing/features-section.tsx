'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot, ShieldCheck, CreditCard } from "lucide-react";

interface FeaturesSectionProps {
    t: (key: string) => string;
}

export function FeaturesSection({ t }: FeaturesSectionProps) {
    const features = [
        {
            icon: <Bot className="h-16 w-16 text-primary" />,
            title: t('featureAI') || "MACHINE INTELLIGENCE",
            description: t('featureAIDesc') || "Autonomous verification signals powered by advanced operational logic.",
        },
        {
            icon: <ShieldCheck className="h-16 w-16 text-primary" />,
            title: t('featureVerified') || "IDENTITY PROTOCOLS",
            description: t('featureVerifiedDesc') || "Multi-tier government-issued credential transparency for 100% signal trust.",
        },
        {
            icon: <CreditCard className="h-16 w-16 text-primary" />,
            title: t('featureEscrow') || "FINANCIAL CLEARANCE",
            description: t('featureEscrowDesc') || "High-discretion escrow terminals ensuring absolute transaction security.",
        },
    ];

    return (
        <section id="features" className="py-24 md:py-32 bg-surface-container-low/20 border-y border-white/5 relative overflow-hidden backdrop-blur-3xl">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="text-center mb-20">
                    <h2 className="text-5xl md:text-7xl font-black italic tracking-tighter uppercase mb-6 leading-none">{t('sectionTitle') || "ELITE CAPABILITIES"}</h2>
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40 italic max-w-2xl mx-auto leading-relaxed">
                        {t('sectionDesc') || "Uncompromising operational infrastructure for the elite workforce"}
                    </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                    {features.map((feature) => (
                        <Card key={feature.title} className="group relative overflow-hidden text-center bg-surface-container-low/40 border-none ring-1 ring-white/10 shadow-[0_45px_120px_rgba(0,0,0,0.3)] rounded-[3.5rem] transition-all duration-700 hover:translate-y-[-10px] hover:ring-primary/20 backdrop-blur-3xl">
                             <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                            <CardHeader className="relative pt-16">
                                <div className="flex justify-center mb-8">
                                    <div className="p-8 rounded-[3rem] bg-surface-container-low text-primary ring-1 ring-white/10 group-hover:scale-110 group-hover:text-primary transition-all duration-700 shadow-[0_25px_60px_-10px_rgba(0,0,0,0.5)]">
                                        {feature.icon}
                                    </div>
                                </div>
                                <CardTitle className="text-3xl font-black italic tracking-tighter uppercase mb-2">{feature.title}</CardTitle>
                            </CardHeader>
                            <CardContent className="relative pb-16 px-10">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 italic leading-relaxed">{feature.description}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </section>
    );
}
