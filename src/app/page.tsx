
"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, CheckCircle, PanelLeft, ShieldCheck, Zap, Bot, Search, CreditCard, Award } from "lucide-react";
import { Logo } from "@/components/icons";
import { ThemeToggle } from "@/components/theme-toggle";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import HowItWorksCarousel from "@/components/landing/how-it-works-carousel";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  const features = [
    {
      icon: <Bot className="h-10 w-10 text-primary" />,
      title: "AI-Powered Tools",
      description:
        "Generate job descriptions, analyze bids, and get budget suggestions with our intelligent assistants, saving you time and effort.",
    },
    {
      icon: <ShieldCheck className="h-10 w-10 text-primary" />,
      title: "Vetted & Verified Installers",
      description:
        "Connect with a network of trusted professionals whose identities and skills have been verified, ensuring quality and reliability.",
    },
    {
      icon: <CreditCard className="h-10 w-10 text-primary" />,
      title: "Secure Escrow Payments",
      description:
        "Your funds are held securely in a regulated Marketplace Settlement account and are only released upon your explicit approval of the completed work.",
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="container mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2">
            <Logo className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">CCTV Job Connect</span>
          </Link>
        </div>

        <nav className="hidden md:flex items-center gap-4">
          <ThemeToggle />
          <Button variant="secondary" asChild>
            <Link href="/login?tab=login">Log In</Link>
          </Button>
          <Button asChild>
            <Link href="/login?tab=signup">Get Started</Link>
          </Button>
        </nav>
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button size="icon" variant="outline">
                <PanelLeft className="h-5 w-5" />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left">
              <nav className="grid gap-6 text-lg font-medium mt-8">
                <Link href="/login?tab=login" className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground">Log In</Link>
                <Link href="/login?tab=signup" className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground">Sign Up</Link>
                <div className="absolute bottom-4 left-4">
                  <ThemeToggle />
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <main className="flex-grow">
        <section className="py-20 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <Badge variant="outline" className="text-sm py-1 px-4 border-primary/50 text-primary mb-6">
              The Professional CCTV Marketplace
            </Badge>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tighter mb-6">
              Your Project, Our Priority
            </h1>
            <p className="max-w-3xl mx-auto text-lg md:text-xl text-muted-foreground mb-10">
              The only platform that combines verified professionals, AI-powered tools, and secure escrow payments to ensure your CCTV project is a success from start to finish.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button size="lg" asChild>
                <Link href="/login?tab=signup">
                  Post a Job For Free <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="secondary" asChild>
                <Link href="/login?tab=signup">Find Work</Link>
              </Button>
            </div>
            <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <div className="flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground">
                <Zap className="h-5 w-5 text-primary" /> AI-Powered Matchmaking
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
              <h2 className="text-3xl md:text-4xl font-bold">A Smarter Way to Hire</h2>
              <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
                We&apos;ve built intelligent tools and secure workflows to eliminate the guesswork and risk from your projects.
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

        <section id="how-it-works" className="py-20 md:py-24">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold">Your Project Workflow, Perfected</h2>
              <p className="text-muted-foreground mt-2">
                A simple, transparent process for everyone.
              </p>
            </div>
            <HowItWorksCarousel />
          </div>
        </section>

        <section className="py-20 md:py-24 bg-primary text-primary-foreground">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="max-w-2xl mx-auto mb-8">
              Join the growing community of professionals and clients building a better, more secure future with CCTV Job Connect.
            </p>
            <div className="flex justify-center gap-4">
              <Button size="lg" variant="secondary" asChild>
                <Link href="/login?tab=signup">
                  Create Your Account
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-8 border-t">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center text-muted-foreground gap-4">
          <p>&copy; {new Date().getFullYear()} CCTV Job Connect. All Rights Reserved.</p>
          <div className="flex gap-6 text-sm">
            <Link href="/terms" className="hover:underline hover:text-foreground">Terms of Service</Link>
            <Link href="/privacy" className="hover:underline hover:text-foreground">Privacy Policy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
