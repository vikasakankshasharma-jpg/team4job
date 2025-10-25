
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
import React, { useEffect, useState } from "react";
import { HelpDialog } from "@/components/help-dialog";
import { Button } from "@/components/ui/button";
import { HelpCircle } from "lucide-react";
import { useJsApiLoader } from "@react-google-maps/api";

const GOOGLE_MAPS_LIBRARIES = ["places", "geocoding"] as ("places" | "geocoding")[];

function LoginPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") || "login";
  const [activeTab, setActiveTab] = useState(initialTab);

  const { isLoaded: isMapLoaded } = useJsApiLoader({
    id: 'google-map-script-login',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  useEffect(() => {
    const tabFromUrl = searchParams.get("tab") || "login";
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
            <span>CCTV Job Connect</span>
          </Link>
        </div>
        <div className="flex-1 flex justify-end items-center gap-2">
          <HelpDialog>
            <Button variant="outline" size="icon">
              <HelpCircle className="h-5 w-5" />
              <span className="sr-only">Help</span>
            </Button>
          </HelpDialog>
          <ThemeToggle />
        </div>
       </header>
      <main className="flex-grow flex items-center justify-center w-full">
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
                <SignUpForm isMapLoaded={isMapLoaded} />
                </CardContent>
            </Card>
            </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}


export default function LoginPage() {
  return (
      <LoginPageContent />
  )
}
