
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { ArrowRight, CheckCircle, PanelLeft, ShieldCheck, Zap } from "lucide-react";
import { Logo } from "@/components/icons";
import { ThemeToggle } from "@/components/theme-toggle";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import React from "react";

export default function Home() {
  const features = [
    {
      icon: <Zap className="h-8 w-8 text-primary" />,
      title: "AI-Powered Tools",
      description:
        "Generate job descriptions and craft perfect bids with our intelligent assistants.",
    },
    {
      icon: <ShieldCheck className="h-8 w-8 text-primary" />,
      title: "Verified Installers",
      description:
        "Connect with trusted professionals whose skills and credentials have been verified.",
    },
    {
      icon: <CheckCircle className="h-8 w-8 text-primary" />,
      title: "Secure Payments",
      description:
        "Payments are handled securely through a trusted gateway (e.g., Cashfree) and released upon job completion.",
    },
  ];

  const howItWorks = [
    {
      step: 1,
      title: "Post Your Job",
      description:
        "Job Givers detail their CCTV needs, budget, and location.",
    },
    {
      step: 2,
      title: "Receive Bids",
      description:
        "Verified installers bid on your job and communicate via comments.",
    },
    {
      step: 3,
      title: "Select & Confirm",
      description:
        "Choose the best installer. Funds are handled securely until the job is done.",
    },
  ];

  return (
    <div className="flex flex-col min-h-screen">
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
            <Link href="/login?tab=signup">Sign Up</Link>
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
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tighter mb-6">
              The Right CCTV Pro for Any Job
            </h1>
            <p className="max-w-2xl mx-auto text-lg md:text-xl text-muted-foreground mb-10">
              Connect with verified CCTV installers, get competitive bids, and manage your projects with AI-powered tools and secure payments.
            </p>
            <div className="flex justify-center gap-4">
              <Button size="lg" asChild>
                <Link href="/login?tab=signup">
                  Post a Job <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="secondary" asChild>
                <Link href="/login?tab=signup">Find Work</Link>
              </Button>
            </div>
          </div>
        </section>

        <section id="features" className="py-20 md:py-24 bg-card">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold">Why Choose Us?</h2>
              <p className="text-muted-foreground mt-2">
                Everything you need for a successful installation.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {features.map((feature) => (
                <div key={feature.title} className="text-center">
                  <div className="flex justify-center mb-4">{feature.icon}</div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="py-20 md:py-24">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold">How It Works</h2>
              <p className="text-muted-foreground mt-2">
                A simple, transparent process for everyone.
              </p>
            </div>
            <Carousel
              opts={{
                align: "start",
                loop: true,
              }}
              className="w-full max-w-4xl mx-auto"
            >
              <CarouselContent>
                {howItWorks.map((item, index) => (
                  <CarouselItem key={index} className="md:basis-1/2 lg:basis-1/3">
                    <div className="p-1 h-full">
                       <Card className="text-center h-full flex flex-col">
                        <CardHeader>
                          <div className="mx-auto w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold mb-4">
                            {item.step}
                          </div>
                          <CardTitle>{item.title}</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-grow">
                          <p className="text-muted-foreground">{item.description}</p>
                        </CardContent>
                      </Card>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious />
              <CarouselNext />
            </Carousel>
          </div>
        </section>
      </main>

      <footer className="py-6 border-t">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center text-muted-foreground">
          &copy; {new Date().getFullYear()} CCTV Job Connect. All Rights Reserved.
        </div>
      </footer>
    </div>
  );
}
