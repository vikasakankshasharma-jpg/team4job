
"use client";

import React from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Autoplay from "embla-carousel-autoplay";

export default function HowItWorksCarousel() {
  const plugin = React.useRef(
    Autoplay({ delay: 4000, stopOnInteraction: true })
  );

  const howItWorks = [
    {
      step: 1,
      title: "AI-Assisted Job Post",
      description:
        "Describe your needs in plain English. Our AI crafts a professional job post, suggests a fair budget, and can even find matching installers for you.",
    },
    {
      step: 2,
      title: "Receive Smart Bids",
      description:
        "Verified installers submit detailed bids. Our AI Bid Assistant helps them write professional proposals.",
    },
    {
      step: 3,
      title: "Analyze & Award Strategically",
      description:
        "Use our AI Bid Analysis to compare offers. Award the job to multiple installers simultaneously or rank them for sequential offers.",
    },
    {
      step: 4,
      title: "Fund Securely with Escrow",
      description:
        "Fund the job with confidence. Your payment is held securely in a regulated Marketplace Settlement account and is only released when you approve the work.",
    },
    {
      step: 5,
      title: "Collaborate & Manage",
      description:
        "Communicate privately, manage scope changes, and track job progress all in one place.",
    },
    {
      step: 6,
      title: "Dual-Confirmation & Review",
      description:
        "The installer submits proof of work, and you explicitly approve it. Only then are funds released. Leave a review to build the community.",
    },
  ];

  return (
    <div className="relative w-full max-w-sm sm:max-w-xl md:max-w-3xl lg:max-w-4xl mx-auto">
      <Carousel
        plugins={[plugin.current]}
        onMouseEnter={plugin.current.stop}
        onMouseLeave={plugin.current.reset}
        opts={{
          align: "start",
          loop: true,
        }}
        className="relative w-full"
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
        <CarouselPrevious className="absolute left-[-50px] top-1/2 -translate-y-1/2" />
        <CarouselNext className="absolute right-[-50px] top-1/2 -translate-y-1/2" />
      </Carousel>
    </div>
  );
}
