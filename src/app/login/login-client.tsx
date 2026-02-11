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
    <div className="flex min-h-screen flex-col items-center p-4">
      <header className="w-full max-w-5xl flex items-center p-8">
        <div className="flex-1 flex justify-start">
          <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
            <Logo className="h-7 w-7" />
            <span>{t('brandName')}</span>
          </Link>
        </div>
        <div className="flex-1 flex justify-end items-center gap-2">
          <HelpDialog>
            <Button variant="outline" size="icon">
              <HelpCircle className="h-5 w-5" />
              <span className="sr-only">{t('help')}</span>
            </Button>
          </HelpDialog>
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </header>
      <main id="main-content" className="flex-grow flex items-center justify-center w-full">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full max-w-md">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">{t('loginTab')}</TabsTrigger>
            <TabsTrigger value="signup">{t('signupTab')}</TabsTrigger>
          </TabsList>
          <TabsContent value="login">
            <Card>
              <CardHeader>
                <CardTitle>{t('loginTitle')}</CardTitle>
                <CardDescription>
                  {t('loginDescription')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <LoginForm />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="signup">
            <Card>
              <CardHeader>
                <CardTitle>{t('signupTitle')}</CardTitle>
                <CardDescription>
                  {t('signupDescription')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SignUpWrapper referredBy={searchParams?.get("ref") ?? undefined} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
