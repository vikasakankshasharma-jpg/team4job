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
    <section className="py-24 md:py-32 bg-primary text-black">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-4xl md:text-6xl font-black italic tracking-tighter uppercase mb-6 leading-none">{t('ctaTitle')}</h2>
            <p className="max-w-2xl mx-auto mb-12 text-lg font-bold uppercase tracking-widest opacity-70 italic">
                {t('ctaDesc')}
            </p>
            <div className="flex justify-center gap-6">
                <Button size="lg" variant="secondary" asChild className="h-16 px-10 rounded-[1.75rem] bg-black text-white font-black text-[10px] uppercase tracking-[0.4em] italic shadow-[0_25px_60px_-10px_rgba(0,0,0,0.4)] hover:scale-105 active:scale-95 transition-all" onClick={() => trackFunnelEvent('cta_click', { source: 'footer_cta' })}>
                    <Link href="/login?tab=signup">
                        {t('ctaButton') || "INITIALIZE JOIN"}
                    </Link>
                </Button>
            </div>
        </div>
    </section>
)), { ssr: true });

const Footer = dynamic(() => Promise.resolve(({ t }: { t: any }) => (
    <footer className="pt-24 pb-12 bg-surface-container-low/40 border-none ring-1 ring-white/10 rounded-t-[4rem] backdrop-blur-3xl shadow-[0_-45px_120px_rgba(0,0,0,0.3)] relative z-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
             <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
                 <div className="col-span-1 md:col-span-2">
                     <Link href="/" className="flex items-center gap-3 mb-6 group">
                         <Logo className="h-10 w-10 text-primary group-hover:rotate-12 transition-transform duration-500" />
                         <span className="text-2xl font-black italic tracking-[0.2em] uppercase bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/40">Team4Job</span>
                     </Link>
                     <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 italic leading-relaxed max-w-sm">Join the growing community of professionals and clients building a better, more secure future through high-authority signal verification.</p>
                 </div>
                 <div>
                     <h4 className="text-[10px] font-black italic uppercase tracking-[0.4em] text-blue-600 dark:text-blue-400 mb-6">Platform</h4>
                     <ul className="space-y-4 text-[10px] font-black uppercase tracking-[0.2em] opacity-60 italic">
                         <li><Link href="/login?tab=signup" className="hover:text-primary transition-colors hover:translate-x-1 inline-block">Post a Job</Link></li>
                         <li><Link href="/jobs" className="hover:text-primary transition-colors hover:translate-x-1 inline-block">Browse Jobs</Link></li>
                         <li><Link href="/login?tab=signup" className="hover:text-primary transition-colors hover:translate-x-1 inline-block">Create Profile</Link></li>
                     </ul>
                 </div>
                 <div>
                     <h4 className="text-[10px] font-black italic uppercase tracking-[0.4em] text-blue-600 dark:text-blue-400 mb-6">Company</h4>
                     <ul className="space-y-4 text-[10px] font-black uppercase tracking-[0.2em] opacity-60 italic">
                         <li><Link href="/terms-of-service" className="hover:text-primary transition-colors hover:translate-x-1 inline-block">{t('footerTerms')}</Link></li>
                         <li><Link href="/privacy-policy" className="hover:text-primary transition-colors hover:translate-x-1 inline-block">{t('footerPrivacy')}</Link></li>
                         <li><Link href="/refund-policy" className="hover:text-primary transition-colors hover:translate-x-1 inline-block">{t('footerRefund')}</Link></li>
                     </ul>
                 </div>
             </div>
             <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center text-[10px] font-black uppercase tracking-[0.4em] text-foreground/50 italic gap-4">
                 <p>&copy; {new Date().getFullYear()} {t('footerRights')}</p>
             </div>
        </div>
    </footer>
)), { ssr: true });

export default function HomeClient() {
    const t = useTranslations('landing');

    return (
        <div className="flex flex-col min-h-screen bg-background">
            <header className="sticky top-0 z-50 w-full border-none bg-background/80 backdrop-blur-3xl supports-[backdrop-filter]:bg-background/40 ring-1 ring-white/5">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-24 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-all group">
                            <Logo className="h-10 w-10 text-primary group-hover:rotate-12 transition-transform duration-500" />
                            <span className="text-2xl font-black italic tracking-[0.2em] uppercase bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/50">Team4Job</span>
                        </Link>
                    </div>

                    <nav className="flex items-center gap-3 sm:gap-6">
                        <div className="flex items-center gap-6 border-r border-white/10 pr-10 mr-4 hidden lg:flex">
                            <LanguageToggle />
                            <ThemeToggle />
                        </div>
                        <Button variant="ghost" asChild className="hidden sm:inline-flex text-[10px] font-black italic uppercase tracking-[0.3em] hover:bg-primary/10 hover:text-primary transition-all">
                            <Link href="/jobs">Browse Jobs</Link>
                        </Button>
                        <Button variant="ghost" asChild className="hidden sm:inline-flex text-[10px] font-black italic uppercase tracking-[0.3em] hover:bg-primary/10 hover:text-primary transition-all" onClick={() => trackFunnelEvent('cta_click', { source: 'header_login_desktop' })}>
                            <Link href="/login?tab=login">{t('loginButton')}</Link>
                        </Button>
                        <Button asChild className="h-14 px-8 text-[10px] font-black italic uppercase tracking-[0.4em] shadow-2xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all rounded-[1.25rem]" onClick={() => trackFunnelEvent('cta_click', { source: 'header_signup' })}>
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
                        
                        <h1 className="text-7xl md:text-[8rem] font-black italic tracking-tighter mb-10 text-balance leading-[0.9] uppercase bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/40">
                            {t('hero')}
                        </h1>
                        
                        <p className="max-w-4xl mx-auto text-[10px] font-black uppercase tracking-[0.5em] text-muted-foreground/60 mb-20 text-balance leading-relaxed italic">
                            {t('heroDescription')}
                        </p>
                        
                        <div className="flex flex-col sm:flex-row justify-center gap-10 mb-20 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
                            <Button size="lg" asChild className="h-24 px-14 text-2xl font-black italic tracking-tighter uppercase rounded-[3.5rem] bg-primary text-black shadow-primary/30 shadow-[0_45px_120px_-20px_rgba(var(--primary),0.4)] hover:translate-y-[-8px] hover:shadow-primary/60 active:scale-95 transition-all group" onClick={() => trackFunnelEvent('cta_click', { source: 'hero_primary' })}>
                                <Link href="/login?tab=signup" className="flex items-center">
                                    {t('postJobButton')} <ArrowRight className="ml-4 h-8 w-8 group-hover:translate-x-3 transition-transform" />
                                </Link>
                            </Button>
                            <Button size="lg" variant="outline" asChild className="h-24 px-14 text-2xl font-black italic tracking-tighter uppercase rounded-[3.5rem] border-white/10 bg-surface-container-low/20 backdrop-blur-3xl transition-all shadow-2xl hover:translate-y-[-8px] active:scale-95" onClick={() => trackFunnelEvent('cta_click', { source: 'hero_secondary' })}>
                                <Link href="/jobs">{t('findWorkButton')}</Link>
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-12 max-w-5xl mx-auto border-t border-white/10 pt-20">
                            <div className="flex items-center justify-center gap-4 text-[10px] font-black italic uppercase tracking-[0.3em] text-foreground/40">
                                <div className="p-4 rounded-[1.5rem] bg-surface-container-low text-primary ring-1 ring-white/10 shadow-2xl group hover:scale-110 transition-transform">
                                    <Bot className="h-6 w-6" />
                                </div>
                                {t('feature1Title')}
                            </div>
                            <div className="flex items-center justify-center gap-4 text-[10px] font-black italic uppercase tracking-[0.3em] text-foreground/40">
                                <div className="p-4 rounded-[1.5rem] bg-surface-container-low text-primary ring-1 ring-white/10 shadow-2xl group hover:scale-110 transition-transform">
                                    <ShieldCheck className="h-6 w-6" />
                                </div>
                                {t('feature2Title')}
                            </div>
                            <div className="flex items-center justify-center gap-4 text-[10px] font-black italic uppercase tracking-[0.3em] text-foreground/40">
                                <div className="p-4 rounded-[1.5rem] bg-surface-container-low text-primary ring-1 ring-white/10 shadow-2xl group hover:scale-110 transition-transform">
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
