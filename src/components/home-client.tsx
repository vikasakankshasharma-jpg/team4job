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

// Lazy load non-critical sections — no loading placeholder since ssr:true handles initial render
const FeaturesSection = dynamic(() => import('./landing/features-section').then(mod => mod.FeaturesSection), {
    ssr: true,
});
const HowItWorksSection = dynamic(() => import('./landing/how-it-works-section').then(mod => mod.HowItWorksSection), {
    ssr: true,
});
const TrustProofSection = dynamic(() => import('./landing/trust-proof').then(mod => mod.TrustProofSection), {
    ssr: true,
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
    <footer className="py-12 border-t bg-secondary/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
             <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
                 <div className="col-span-1 md:col-span-2">
                     <Link href="/" className="flex items-center gap-2.5 mb-4">
                         <Logo className="h-8 w-8 text-primary" />
                         <span className="text-xl font-bold tracking-tight">Team4Job</span>
                     </Link>
                     <p className="text-muted-foreground max-w-sm">Join the growing community of professionals and clients building a better, more secure future.</p>
                 </div>
                 <div>
                     <h4 className="font-semibold mb-4 text-foreground">Platform</h4>
                     <ul className="space-y-3 text-sm text-muted-foreground">
                         <li><Link href="/login?tab=signup" className="hover:text-primary transition-colors">Post a Job</Link></li>
                         <li><Link href="/jobs" className="hover:text-primary transition-colors">Browse Jobs</Link></li>
                         <li><Link href="/login?tab=signup" className="hover:text-primary transition-colors">Create Profile</Link></li>
                     </ul>
                 </div>
                 <div>
                     <h4 className="font-semibold mb-4 text-foreground">Company</h4>
                     <ul className="space-y-3 text-sm text-muted-foreground">
                         <li><Link href="/terms-of-service" className="hover:text-primary transition-colors">{t('footerTerms')}</Link></li>
                         <li><Link href="/privacy-policy" className="hover:text-primary transition-colors">{t('footerPrivacy')}</Link></li>
                         <li><Link href="/refund-policy" className="hover:text-primary transition-colors">{t('footerRefund')}</Link></li>
                     </ul>
                 </div>
             </div>
             <div className="pt-8 border-t flex flex-col md:flex-row justify-between items-center text-sm text-muted-foreground gap-4">
                 <p>&copy; {new Date().getFullYear()} {t('footerRights')}</p>
             </div>
        </div>
    </footer>
)), { ssr: true });

export default function HomeClient() {
    const t = useTranslations('landing');

    return (
        <div className="flex flex-col min-h-screen bg-background">
            <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
                            <Logo className="h-9 w-9 text-primary" />
                            <span className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">Team4Job</span>
                        </Link>
                    </div>

                    <nav className="flex items-center gap-3 sm:gap-6">
                        <div className="flex items-center gap-4 border-r pr-6 mr-2 hidden lg:flex">
                            <LanguageToggle />
                            <ThemeToggle />
                        </div>
                        <Button variant="ghost" asChild className="hidden sm:inline-flex text-base font-medium">
                            <Link href="/jobs">Browse Jobs</Link>
                        </Button>
                        <Button variant="ghost" asChild className="hidden sm:inline-flex text-base font-medium" onClick={() => trackFunnelEvent('cta_click', { source: 'header_login_desktop' })}>
                            <Link href="/login?tab=login">{t('loginButton')}</Link>
                        </Button>
                        <Button asChild className="px-5 h-10 text-sm font-semibold shadow-md hover:shadow-lg transition-all rounded-full" onClick={() => trackFunnelEvent('cta_click', { source: 'header_signup' })}>
                            <Link href="/login?tab=signup">{t('getStartedButton')}</Link>
                        </Button>
                    </nav>
                </div>
            </header>

            <main id="main-content" className="flex-grow">
                <section className="py-24 md:py-40 overflow-hidden relative">
                    {/* Background decoration */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 opacity-40 pointer-events-none">
                        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/10 blur-[140px] rounded-full" />
                        <div className="absolute top-[10%] right-[-10%] w-[40%] h-[60%] bg-blue-500/10 blur-[140px] rounded-full" />
                    </div>

                    <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
                        <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-6 py-2 text-sm font-medium text-primary mb-10 backdrop-blur-sm animate-in fade-in slide-in-from-bottom-4 duration-1000">
                             <span className="mr-2 h-2 w-2 rounded-full bg-primary animate-pulse" />
                             {t('tagline')}
                        </div>
                        
                        <h1 className="text-6xl md:text-8xl font-black tracking-tight mb-8 text-balance leading-[1.1]">
                            {t('hero')}
                        </h1>
                        
                        <p className="max-w-3xl mx-auto text-xl md:text-2xl text-muted-foreground/80 mb-14 text-balance leading-relaxed font-medium">
                            {t('heroDescription')}
                        </p>
                        
                        <div className="flex flex-col sm:flex-row justify-center gap-5 mb-12">
                            <Button size="lg" asChild className="h-16 px-10 text-xl font-bold rounded-xl shadow-blue-500/20 shadow-2xl hover:translate-y-[-2px] transition-all group" onClick={() => trackFunnelEvent('cta_click', { source: 'hero_primary' })}>
                                <Link href="/login?tab=signup" className="flex items-center">
                                    {t('postJobButton')} <ArrowRight className="ml-2 h-6 w-6 group-hover:translate-x-1 transition-transform" />
                                </Link>
                            </Button>
                            <Button size="lg" variant="outline" asChild className="h-16 px-10 text-xl font-bold rounded-xl border-border/50 hover:bg-secondary/50 backdrop-blur-sm transition-all shadow-sm" onClick={() => trackFunnelEvent('cta_click', { source: 'hero_secondary' })}>
                                <Link href="/jobs">{t('findWorkButton')}</Link>
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 max-w-5xl mx-auto border-t border-border/50 pt-16">
                            <div className="flex items-center justify-center gap-3 text-base font-semibold text-foreground/80">
                                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                    <Bot className="h-6 w-6" />
                                </div>
                                {t('feature1Title')}
                            </div>
                            <div className="flex items-center justify-center gap-3 text-base font-semibold text-foreground/80">
                                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                    <ShieldCheck className="h-6 w-6" />
                                </div>
                                {t('feature2Title')}
                            </div>
                            <div className="flex items-center justify-center gap-3 text-base font-semibold text-foreground/80">
                                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                    <CreditCard className="h-6 w-6" />
                                </div>
                                {t('feature3Title')}
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
