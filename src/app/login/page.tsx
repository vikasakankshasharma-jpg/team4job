
"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoginForm } from "@/components/auth/login-form";
import { SignUpForm } from "@/components/auth/signup-form";
import { Logo } from "@/components/icons";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import React, { useEffect, useState, Suspense } from "react";

function LoginPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") || "login";
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    // Sync state with URL if it changes (e.g., browser back/forward)
    const tabFromUrl = searchParams.get("tab") || "login";
    if (tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams, activeTab]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    // Update the URL without reloading the page
    const params = new URLSearchParams(searchParams);
    params.set("tab", value);
    router.push(`${pathname}?${params.toString()}`);
  };
  
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
       <header className="w-full max-w-5xl absolute top-0 left-1/2 -translate-x-1/2 flex items-center p-8">
        <div className="flex-1 flex justify-start">
          <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
            <Logo className="h-7 w-7" />
            <span>CCTV Job Connect</span>
          </Link>
        </div>
        <div className="flex-1 flex justify-end">
          <ThemeToggle />
        </div>
       </header>
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full max-w-md">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="login">Log In</TabsTrigger>
          <TabsTrigger value="signup">Sign Up</TabsTrigger>
        </TabsList>
        <TabsContent value="login">
          <Card>
            <CardHeader>
              <CardTitle>Log In</CardTitle>
              <CardDescription>
                Enter your credentials to access your dashboard.
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
              <CardTitle>Create an Account</CardTitle>
              <CardDescription>
                Choose your role and fill in your details to get started.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SignUpForm />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <LoginPageContent />
        </Suspense>
    )
}
