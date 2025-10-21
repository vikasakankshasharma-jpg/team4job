
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { ArrowRight, CheckCircle, ShieldCheck, Zap } from "lucide-react";
import { Logo } from "@/components/icons";
import { ThemeToggle } from "@/components/theme-toggle";

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
        "Payments are handled securely through a trusted gateway and released upon job completion.",
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
      <header className="container mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center">
        <div className="flex-1 flex justify-start">
          <Link href="/" className="flex items-center gap-2">
            <Logo className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">CCTV Job Connect</span>
          </Link>
        </div>
        
        <div className="flex-1 hidden md:flex justify-center">
          {/* Can add nav links here in the future */}
        </div>

        <nav className="flex-1 flex justify-end items-center gap-4">
          <ThemeToggle />
          <Button variant="secondary" asChild>
            <Link href="/login?tab=login">Log In</Link>
          </Button>
          <Button asChild>
            <Link href="/login?tab=signup">Sign Up</Link>
          </Button>
        </nav>
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
            <div className="relative">
              <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-border -translate-y-1/2"></div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
                {howItWorks.map((item) => (
                  <Card key={item.step} className="text-center">
                    <CardHeader>
                      <div className="mx-auto w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold mb-4">
                        {item.step}
                      </div>
                      <CardTitle>{item.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">{item.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
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
