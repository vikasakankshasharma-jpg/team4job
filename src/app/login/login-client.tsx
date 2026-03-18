'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoginForm } from "@/components/auth/login-form";
import dynamic from 'next/dynamic';
import { Logo } from "@/components/icons";

const SignUpWrapper = dynamic(() => import('@/components/auth/signup-wrapper').then(mod => mod.SignUpWrapper), {
  loading: () => <div className="h-96 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>,
  ssr: false
});

import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import React, { useEffect, useState } from "react";
import { HelpDialog } from "@/components/help-dialog";
import { Button } from "@/components/ui/button";
import { HelpCircle, Loader2 } from "lucide-react";
import { useHelp } from "@/hooks/use-help";
import { useTranslations } from 'next-intl';
import { LanguageToggle } from "@/components/layout/language-toggle";

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
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 opacity-30 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-400/10 blur-[120px] rounded-full" />
      </div>

      <header className="w-full max-w-5xl flex items-center p-8 relative z-10">
        <div className="flex-1 flex justify-start">
          <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
            <Logo className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">{t('brandName')}</span>
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

      <main id="main-content" className="flex-grow flex items-center justify-center w-full relative z-10 py-12">
        <div className="w-full max-w-[450px]">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-secondary/50 rounded-2xl p-1 mb-8 border border-border/50 backdrop-blur-sm h-14">
              <TabsTrigger value="login" className="rounded-xl text-lg font-semibold data-[state=active]:shadow-lg data-[state=active]:bg-background data-[state=active]:text-primary transition-all duration-300">{t('loginTab')}</TabsTrigger>
              <TabsTrigger value="signup" className="rounded-xl text-lg font-semibold data-[state=active]:shadow-lg data-[state=active]:bg-background data-[state=active]:text-primary transition-all duration-300">{t('signupTab')}</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login" className="mt-0 outline-none">
              <Card className="border border-border/50 shadow-2xl shadow-primary/5 bg-background/60 backdrop-blur-xl rounded-[2.5rem] overflow-hidden">
                <CardHeader className="pt-10 px-10">
                  <CardTitle className="text-4xl font-black tracking-tight mb-3">{t('loginTitle')}</CardTitle>
                  <CardDescription className="text-lg text-muted-foreground/70">
                    {t('loginDescription')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-10 pb-10">
                  <LoginForm />
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="signup" className="mt-0 outline-none">
              <Card className="border border-border/50 shadow-2xl shadow-primary/5 bg-background/60 backdrop-blur-xl rounded-[2.5rem] overflow-hidden">
                <CardHeader className="pt-10 px-10">
                  <CardTitle className="text-4xl font-black tracking-tight mb-3">{t('signupTitle')}</CardTitle>
                  <CardDescription className="text-lg text-muted-foreground/70">
                    {t('signupDescription')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-10 pb-10">
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
