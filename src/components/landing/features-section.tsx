'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot, ShieldCheck, CreditCard } from "lucide-react";

interface FeaturesSectionProps {
    t: (key: string) => string;
}

export function FeaturesSection({ t }: FeaturesSectionProps) {
    const features = [
        {
            icon: <Bot className="h-10 w-10 text-primary" />,
            title: t('featureAI'),
            description: t('featureAIDesc'),
        },
        {
            icon: <ShieldCheck className="h-10 w-10 text-primary" />,
            title: t('featureVerified'),
            description: t('featureVerifiedDesc'),
        },
        {
            icon: <CreditCard className="h-10 w-10 text-primary" />,
            title: t('featureEscrow'),
            description: t('featureEscrowDesc'),
        },
    ];

    return (
        <section id="features" className="py-20 md:py-24 bg-card/50">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold">{t('sectionTitle')}</h2>
                    <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
                        {t('sectionDesc')}
                    </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {features.map((feature) => (
                        <Card key={feature.title} className="text-center border-0 bg-transparent shadow-none">
                            <CardHeader>
                                <div className="flex justify-center mb-4">{feature.icon}</div>
                                <CardTitle>{feature.title}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground">{feature.description}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </section>
    );
}
