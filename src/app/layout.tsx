
import type { Metadata } from "next";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import { FirebaseClientProvider } from "@/infrastructure/firebase/client-provider";
import { UserProvider } from "@/hooks/use-user";
import { Providers } from "@/components/providers";
import { IntlProvider } from "@/components/providers/intl-provider";
import Script from 'next/script';
import { GA_TRACKING_ID, ANALYTICS_DISABLED } from '@/lib/analytics';
import { WebVitalsReporter } from "@/components/dashboard/analytics/web-vitals";
import CookieBanner from "@/components/gdpr/cookie-banner";
import { AnalyticsInjector } from "@/components/gdpr/analytics-injector";
import { SystemStatusBanner } from "@/components/layout/system-status-banner";
import ErrorBoundaryWrapper from "@/components/error-boundary-wrapper";
import { OfflineDetector } from "@/components/layout/offline-detector";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.team4job.com"),
  alternates: {
    canonical: '/',
  },
  title: "Team4Job | Professional Services Marketplace",
  description: "The premier marketplace for skilled technical professionals. Connect with verified experts for Networking, Electrical, Security, and more.",
  keywords: ["Team4Job", "Technical Services", "Networking", "Electrical", "Security", "Installation", "Marketplace", "Professional Services"],
  authors: [{ name: "Team4Job Team" }],
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://www.team4job.com",
    siteName: "Team4Job",
    title: "Team4Job | Hire Verified Professionals",
    description: "The most secure way to hire skilled professionals. Vetted experts and escrow protection.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Team4Job Marketplace",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Team4Job",
    description: "The most secure way to hire skilled professionals.",
    creator: "@team4job",
    images: ["/og-image.png"],
  },
};

export const viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
};

// Removed next-intl server imports - handling i18n client-side only
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Using static locale - language switching handled client-side
  const locale = 'en';
  const analyticsEnabled = !!GA_TRACKING_ID && !ANALYTICS_DISABLED;

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        {/* PWA Manifest */}
        <link rel="manifest" href="/manifest.webmanifest" />
        {/* Preconnect to external services for faster loading */}
        {analyticsEnabled && (
          <link rel="preconnect" href="https://www.googletagmanager.com" crossOrigin="anonymous" />
        )}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=optional" />
        {analyticsEnabled && (
          <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
        )}
        <link rel="dns-prefetch" href="https://sdk.cashfree.com" />
      </head>
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased"
        )}
        suppressHydrationWarning
      >
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-background focus:text-foreground">
          Skip to main content
        </a>
        <ThemeProvider
          attribute="class"
          defaultTheme="modern"
          themes={['light', 'dark', 'modern', 'system']}
          enableSystem
          disableTransitionOnChange
        >
          <IntlProvider>
            <FirebaseClientProvider>
              <UserProvider>
                <Providers>
                  <OfflineDetector />
                  <ErrorBoundaryWrapper>
                    <WebVitalsReporter />
                    <SystemStatusBanner />
                    {children}
                  </ErrorBoundaryWrapper>
                </Providers>
              </UserProvider>
            </FirebaseClientProvider>
          </IntlProvider>
          <Toaster />
        </ThemeProvider>
        {/* ... (rest of the file) */}
        {/* Google Analytics & Vercel Insights - loaded dynamically after cookie consent */}

        {/* JSON-LD Structured Data */}
        <Script id="structured-data" type="application/ld+json">
          {`
            {
              "@context": "https://schema.org",
              "@type": "WebApplication",
              "name": "Team4Job",
              "description": "Professional Marketplace for Skilled Services",
              "url": "https://www.team4job.com",
              "applicationCategory": "BusinessApplication",
              "operatingSystem": "Web",
              "publisher": {
                "@type": "Organization",
                "name": "Team4Job",
                "logo": {
                  "@type": "ImageObject",
                  "url": "https://www.team4job.com/icon-512.png"
                }
              },
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "INR"
              }
            }
          `}
        </Script>
        
        {/* Breadcrumb JSON-LD */}
        <Script id="breadcrumb-data" type="application/ld+json">
          {`
            {
              "@context": "https://schema.org",
              "@type": "BreadcrumbList",
              "itemListElement": [{
                "@type": "ListItem",
                "position": 1,
                "name": "Home",
                "item": "https://www.team4job.com"
              }]
            }
          `}
        </Script>

        {/* Cashfree Payment SDK - deferred */}
        <Script
          src="https://sdk.cashfree.com/js/v3/cashfree.js"
          strategy="lazyOnload"
          async
        />
        <Script id="register-sw" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                const params = new URLSearchParams({
                  apiKey: '${process.env.NEXT_PUBLIC_FIREBASE_API_KEY}',
                  authDomain: '${process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN}',
                  projectId: '${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}',
                  storageBucket: '${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}',
                  messagingSenderId: '${process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID}',
                  appId: '${process.env.NEXT_PUBLIC_FIREBASE_APP_ID}'
                }).toString();
                navigator.serviceWorker.register('/sw.js?' + params).catch(function(err) {
                  // Service Worker registration failed
                });
              });
            }
          `}
        </Script>
        <CookieBanner />
        <AnalyticsInjector />
      </body>
    </html >
  );
}
