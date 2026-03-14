'use client';

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, Bot, ShieldCheck, CreditCard } from "lucide-react";
import { trackFunnelEvent } from '@/lib/analytics';
import { Logo } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { LanguageToggle } from "@/components/layout/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';

// Lazy load non-critical sections
const FeaturesSection = dynamic(() => import('./landing/features-section').then(mod => mod.FeaturesSection), {
    ssr: true,
    loading: () => <div className="h-96 animate-pulse bg-muted/20" />
});
const HowItWorksSection = dynamic(() => import('./landing/how-it-works-section').then(mod => mod.HowItWorksSection), {
    ssr: true,
    loading: () => <div className="h-96 animate-pulse bg-muted/20" />
});
const TrustProofSection = dynamic(() => import('./landing/trust-proof').then(mod => mod.TrustProofSection), {
    ssr: true,
    loading: () => <div className="h-64 animate-pulse bg-muted/20" />
});

// Footer and CTA are also candidates for late loading
const CTASection = dynamic(() => Promise.resolve(({ t }: { t: any }) => (
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
)), { ssr: true });

const Footer = dynamic(() => Promise.resolve(({ t }: { t: any }) => (
    <footer className="py-8 border-t">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center text-muted-foreground gap-4">
            <p>&copy; {new Date().getFullYear()} {t('footerRights')}</p>
            <div className="flex gap-6 text-sm">
                <Link href="/terms-of-service" className="hover:underline hover:text-foreground">{t('footerTerms')}</Link>
                <Link href="/privacy-policy" className="hover:underline hover:text-foreground">{t('footerPrivacy')}</Link>
            </div>
        </div>
    </footer>
)), { ssr: true });

export default function HomeClient() {
    const t = useTranslations('landing');

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

                <FeaturesSection t={t} />

                <HowItWorksSection t={t} />

                <TrustProofSection />

                <CTASection t={t} />
            </main>

            <Footer t={t} />
        </div>
    );
}
