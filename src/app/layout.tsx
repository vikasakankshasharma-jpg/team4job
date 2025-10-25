
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import { FirebaseClientProvider } from "@/lib/firebase/client-provider";
import { UserProvider } from "@/hooks/use-user";
import { HelpProvider } from "@/hooks/use-help";
import Script from 'next/script';
import { GoogleMapsProvider } from "@/components/google-maps-provider";

const inter = Inter({ subsets: ["latin"], variable: "--font-body" });

export const metadata: Metadata = {
  title: "CCTV Job Connect",
  description: "Connecting Job Givers with skilled CCTV Installers.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className={cn(
          "min-h-screen bg-background font-body antialiased",
          inter.variable
        )}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <GoogleMapsProvider>
            <FirebaseClientProvider>
              <UserProvider>
                  <HelpProvider>
                      {children}
                  </HelpProvider>
              </UserProvider>
            </FirebaseClientProvider>
          </GoogleMapsProvider>
          <Toaster />
        </ThemeProvider>
         <Script 
          src="https://sdk.cashfree.com/js/v3/cashfree.js" 
          strategy="beforeInteractive" 
        />
      </body>
    </html>
  );
}
