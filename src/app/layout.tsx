
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import { FirebaseClientProvider } from "@/lib/firebase/client-provider";
import { UserProvider } from "@/hooks/use-user";
import { Providers } from "@/components/providers";
import Script from 'next/script';
import { GA_TRACKING_ID } from '@/lib/analytics';
import { WebVitalsReporter } from "@/components/analytics/web-vitals";

const inter = Inter({ subsets: ["latin"], variable: "--font-body" });

export const metadata: Metadata = {
  title: "CCTV Job Connect | Professional Marketplace for CCTV Installations",
  description: "Connect with verified CCTV professionals for your security projects. Secure escrow payments, AI-powered matching, and professional project management.",
  keywords: ["CCTV", "Security", "Installation", "Installer", "Project Management", "Marketplace"],
  authors: [{ name: "CCTV Job Connect Team" }],
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://cctvjobconnect.com",
    siteName: "CCTV Job Connect",
    title: "CCTV Job Connect | Hire Verified Professionals",
    description: "The most secure way to hire CCTV installers. Vetted professionals and escrow protection.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "CCTV Job Connect",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "CCTV Job Connect",
    description: "The most secure way to hire CCTV installers.",
    creator: "@cctvjobconnect",
    images: ["/og-image.png"],
  },
};

export const viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body
        className={cn(
          "min-h-screen bg-background font-body antialiased",
          inter.variable
        )}
        suppressHydrationWarning
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <FirebaseClientProvider>
            <UserProvider>
              <Providers>
                <WebVitalsReporter />
                {children}
              </Providers>
            </UserProvider>
          </FirebaseClientProvider>
          <Toaster />
        </ThemeProvider>
        {/* Google Analytics */}
        {GA_TRACKING_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_TRACKING_ID}', {
                  page_path: window.location.pathname,
                });
              `}
            </Script>
          </>
        )}

        {/* JSON-LD Structured Data */}
        <Script id="structured-data" type="application/ld+json">
          {`
            {
              "@context": "https://schema.org",
              "@type": "WebApplication",
              "name": "CCTV Job Connect",
              "description": "Professional Marketplace for CCTV Installations",
              "url": "https://cctvjobconnect.com",
              "applicationCategory": "BusinessApplication",
              "operatingSystem": "Web",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "INR"
              },
              "aggregateRating": {
                "@type": "AggregateRating",
                "ratingValue": "4.8",
                "ratingCount": "150"
              }
            }
          `}
        </Script>

        {/* Cashfree Payment SDK */}
        <Script
          src="https://sdk.cashfree.com/js/v3/cashfree.js"
          strategy="beforeInteractive"
        />
      </body>
    </html>
  );
}
