'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot, ShieldCheck, CreditCard } from "lucide-react";

interface FeaturesSectionProps {
    t: (key: string) => string;
}

export function FeaturesSection({ t }: FeaturesSectionProps) {
    const features = [
        {
            icon: <Bot className="h-14 w-14 text-primary" />,
            title: t('featureAI'),
            description: t('featureAIDesc'),
        },
        {
            icon: <ShieldCheck className="h-14 w-14 text-primary" />,
            title: t('featureVerified'),
            description: t('featureVerifiedDesc'),
        },
        {
            icon: <CreditCard className="h-14 w-14 text-primary" />,
            title: t('featureEscrow'),
            description: t('featureEscrowDesc'),
        },
    ];

    return (
        <section id="features" className="py-24 md:py-32 bg-slate-50/50 dark:bg-zinc-900/30 border-y relative overflow-hidden">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="text-center mb-20">
                    <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">{t('sectionTitle')}</h2>
                    <p className="text-slate-600 dark:text-slate-400 text-lg max-w-2xl mx-auto whitespace-pre-line">
                        {t('sectionDesc')}
                    </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-12">
                    {features.map((feature) => (
                        <Card key={feature.title} className="group relative overflow-hidden text-center bg-card/50 backdrop-blur-sm border-border/50 shadow-sm hover-lift transition-all duration-500">
                             <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
                            <CardHeader className="relative pt-10">
                                <div className="flex justify-center mb-6">
                                    <div className="p-5 rounded-2xl bg-primary/10 text-primary group-hover:scale-110 group-hover:text-primary transition-transform duration-500 shadow-sm">
                                        {feature.icon}
                                    </div>
                                </div>
                                <CardTitle className="text-2xl font-bold tracking-tight">{feature.title}</CardTitle>
                            </CardHeader>
                            <CardContent className="relative pb-10">
                                <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-lg">{feature.description}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </section>
    );
}
