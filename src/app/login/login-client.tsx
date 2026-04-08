'use client';

import React, { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from 'next/dynamic';
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useTranslations } from 'next-intl';
import { HelpCircle, Loader2 } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

import { LoginForm } from "@/components/auth/login-form";
import { Logo } from "@/components/icons";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { HelpDialog } from "@/components/help-dialog";
import { useHelp } from "@/hooks/use-help";
import { LanguageToggle } from "@/components/layout/language-toggle";

const SignUpWrapper = dynamic(() => import('@/components/auth/signup-wrapper').then(mod => mod.SignUpWrapper), {
  loading: () => <div className="h-96 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>,
  ssr: false
});

export default function LoginClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations('auth');

  const initialTab = searchParams?.get("tab") ?? "login";
  const [activeTab, setActiveTab] = useState(initialTab);
  const { setHelp } = useHelp();

  useEffect(() => {
    setHelp({
      title: t('helpTitle'),
      content: (
        <div className="space-y-4 text-sm">
          <p>{t('helpContent')}</p>
          <ul className="list-disc space-y-2 pl-5">
            <li><span className="font-semibold">{t('helpLoginLabel')}</span> {t('helpLoginText')}</li>
            <li><span className="font-semibold">{t('helpSignupLabel')}</span> {t('helpSignupText')}</li>
          </ul>
        </div>
      ),
    });
  }, [setHelp, t]);

  useEffect(() => {
    const tabFromUrl = searchParams?.get("tab") ?? "login";
    if (tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams, activeTab]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    const newSearchParams = new URLSearchParams(searchParams.toString());
    newSearchParams.set("tab", value);
    router.replace(`${pathname}?${newSearchParams.toString()}`);
  };

  return (
    <div className="flex min-h-screen flex-col items-center p-4 relative overflow-hidden bg-background">
      {/* Background decoration */}
      <div className="absolute inset-0 z-0 h-full w-full bg-background bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]">
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-primary/20 opacity-40 blur-[100px]"></div>
      </div>

      <header className="w-full max-w-5xl flex items-center p-8 relative z-10">
        <div className="flex-1 flex justify-start">
          <Link href="/" className="flex items-center gap-4 hover:opacity-80 transition-all group">
            <Logo className="h-10 w-10 text-primary group-hover:scale-110 transition-transform" />
            <span className="text-2xl font-black italic tracking-[0.4em] uppercase bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">{t('brandName')}</span>
          </Link>
        </div>
        <div className="flex-1 flex justify-end items-center gap-4">
          <HelpDialog>
            <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary/10 hover:text-primary transition-colors">
              <HelpCircle className="h-6 w-6" />
              <span className="sr-only">{t('help')}</span>
            </Button>
          </HelpDialog>
          <div className="flex items-center gap-2 bg-secondary/30 p-1 rounded-full backdrop-blur-sm border border-border/50">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main id="main-content" className="flex-grow flex items-center justify-center w-full relative z-10 py-12 px-4">
        <div className={cn(
          "w-full transition-all duration-700 ease-[cubic-bezier(0.2,0.8,0.2,1)]", 
          activeTab === 'signup' ? "max-w-4xl" : "max-w-[450px]"
        )}>
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <div className="flex justify-center w-full mb-10">
              <TabsList className="grid w-full max-w-[450px] grid-cols-2 bg-surface-container-low/40 rounded-[3rem] p-2 border border-white/5 backdrop-blur-3xl h-20 shadow-2xl ring-1 ring-white/5">
                <TabsTrigger value="login" className="rounded-[2.5rem] text-[10px] font-black italic tracking-[0.3em] uppercase data-[state=active]:shadow-2xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-500 data-[state=inactive]:hover:bg-white/5 h-full">{t('loginTab')}</TabsTrigger>
                <TabsTrigger value="signup" className="rounded-[2.5rem] text-[10px] font-black italic tracking-[0.3em] uppercase data-[state=active]:shadow-2xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-500 data-[state=inactive]:hover:bg-white/5 h-full">{t('signupTab')}</TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="login" className="mt-0 outline-none">
              <Card className="border-none shadow-[0_40px_100px_rgba(0,0,0,0.1)] bg-surface-container-low/40 dark:bg-slate-900/60 backdrop-blur-3xl rounded-[3.5rem] overflow-hidden ring-1 ring-white/10">
                <CardHeader className="pt-12 px-12 pb-8 border-b border-white/5 bg-white/5">
                  <CardTitle className="text-4xl sm:text-6xl font-black italic tracking-tighter uppercase mb-4 leading-none">{t('loginTitle')}</CardTitle>
                  <CardDescription className="text-sm font-medium opacity-60 uppercase tracking-[0.1em]">
                    {t('loginDescription')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-12">
                  <LoginForm />
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="signup" className="mt-0 outline-none">
              <Card className="border-none shadow-[0_40px_100px_rgba(0,0,0,0.1)] bg-surface-container-low/40 dark:bg-slate-900/60 backdrop-blur-3xl rounded-[3.5rem] overflow-hidden relative ring-1 ring-white/10">
                {/* Immersive gradient orb decoration */}
                <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[150px] pointer-events-none animate-pulse" />
                <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[150px] pointer-events-none animate-pulse" />

                <CardContent className="p-8 md:p-12 relative z-10">
                  <SignUpWrapper referredBy={searchParams?.get("ref") ?? undefined} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
