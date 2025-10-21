"use client";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function HowItWorksCarousel() {
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
    <Carousel
      opts={{
        align: "start",
      }}
      className="w-full max-w-sm sm:max-w-xl md:max-w-3xl lg:max-w-4xl mx-auto"
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
  );
}