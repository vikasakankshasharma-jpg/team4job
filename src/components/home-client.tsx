'use client';

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, Bot, ShieldCheck, CreditCard, MapPin, Briefcase, IndianRupee, Star, TrendingUp, CheckCircle, Clock } from "lucide-react";
import { trackFunnelEvent } from '@/lib/analytics';
import { Logo } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrustProofSection } from "@/components/landing/trust-proof";
import { LanguageToggle } from "@/components/layout/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { useTranslations } from 'next-intl';

export default function HomeClient() {
    const t = useTranslations('landing');

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
        <div className="flex flex-col min-h-screen bg-background">
            <header className="container mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/" className="flex items-center gap-2">
                        <Logo className="h-8 w-8 text-primary" />
                        <span className="text-xl font-bold">Team4Job</span>
                    </Link>
                </div>

                <nav className="flex items-center gap-2 sm:gap-4">
                    <LanguageToggle />
                    <ThemeToggle />
                    <Button variant="ghost" asChild className="sm:hidden px-2" onClick={() => trackFunnelEvent('cta_click', { source: 'header_login_mobile' })}>
                        <Link href="/login?tab=login">{t('loginButton')}</Link>
                    </Button>
                    <Button variant="secondary" asChild className="hidden sm:inline-flex" onClick={() => trackFunnelEvent('cta_click', { source: 'header_login_desktop' })}>
                        <Link href="/login?tab=login">{t('loginButton')}</Link>
                    </Button>
                    <Button asChild className="px-3 sm:px-4" onClick={() => trackFunnelEvent('cta_click', { source: 'header_signup' })}>
                        <Link href="/login?tab=signup">{t('getStartedButton')}</Link>
                    </Button>
                </nav>
            </header>

            <main id="main-content" className="flex-grow">
                <section className="py-20 md:py-32">
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
                        <Badge variant="outline" className="text-sm py-1 px-4 border-primary/50 text-primary mb-6">
                            {t('tagline')}
                        </Badge>
                        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tighter mb-6">
                            {t('hero')}
                        </h1>
                        <p className="max-w-3xl mx-auto text-lg md:text-xl text-muted-foreground mb-10">
                            {t('heroDescription')}
                        </p>
                        <div className="flex flex-col sm:flex-row justify-center gap-4">
                            <Button size="lg" asChild onClick={() => trackFunnelEvent('cta_click', { source: 'hero_primary' })}>
                                <Link href="/login?tab=signup">
                                    {t('postJobButton')} <ArrowRight className="ml-2 h-5 w-5" />
                                </Link>
                            </Button>
                            <Button size="lg" variant="secondary" asChild onClick={() => trackFunnelEvent('cta_click', { source: 'hero_secondary' })}>
                                <Link href="/login?tab=signup">{t('findWorkButton')}</Link>
                            </Button>
                        </div>
                        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-4xl mx-auto">
                            <div className="flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground">
                                <Bot className="h-5 w-5 text-primary" /> AI-Powered Matchmaking
                            </div>
                            <div className="flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground">
                                <ShieldCheck className="h-5 w-5 text-primary" /> Verified Professionals
                            </div>
                            <div className="flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground">
                                <CreditCard className="h-5 w-5 text-primary" /> Secure Escrow System
                            </div>
                        </div>
                    </div>
                </section>

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

                <section id="how-it-works" className="py-16 md:py-20">
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl md:text-4xl font-bold">{t('workflowTitle')}</h2>
                            <p className="text-muted-foreground mt-2">
                                {t('workflowDesc')}
                            </p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                            <div className="text-center p-6">
                                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                                    <span className="text-2xl font-bold text-primary">1</span>
                                </div>
                                <h3 className="text-xl font-semibold mb-2">{t('step1Title')}</h3>
                                <p className="text-muted-foreground">{t('step1Desc')}</p>
                            </div>
                            <div className="text-center p-6">
                                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                                    <span className="text-2xl font-bold text-primary">2</span>
                                </div>
                                <h3 className="text-xl font-semibold mb-2">{t('step2Title')}</h3>
                                <p className="text-muted-foreground">{t('step2Desc')}</p>
                            </div>
                            <div className="text-center p-6">
                                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                                    <span className="text-2xl font-bold text-primary">3</span>
                                </div>
                                <h3 className="text-xl font-semibold mb-2">{t('step3Title')}</h3>
                                <p className="text-muted-foreground">{t('step3Desc')}</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Trust Proof Section */}
                <TrustProofSection />

                <section className="py-20 md:py-24 bg-primary text-primary-foreground">
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
                        <h2 className="text-3xl font-bold mb-4">{t('ctaTitle')}</h2>
                        <p className="max-w-2xl mx-auto mb-8">
                            {t('ctaDesc')}
                        </p>
                        <div className="flex justify-center gap-4">
                            <Button size="lg" variant="secondary" asChild onClick={() => trackFunnelEvent('cta_click', { source: 'footer_cta' })}>
                                <Link href="/login?tab=signup">
                                    {t('ctaButton')}
                                </Link>
                            </Button>
                        </div>
                    </div>
                </section>
            </main>

            <footer className="py-8 border-t">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center text-muted-foreground gap-4">
                    <p>&copy; {new Date().getFullYear()} {t('footerRights')}</p>
                    <div className="flex gap-6 text-sm">
                        <Link href="/terms-of-service" className="hover:underline hover:text-foreground">{t('footerTerms')}</Link>
                        <Link href="/privacy-policy" className="hover:underline hover:text-foreground">{t('footerPrivacy')}</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
