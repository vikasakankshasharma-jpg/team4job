
"use client";

import { UserProvider } from "@/hooks/use-user";
import { ThemeProvider } from "@/components/theme-provider";
import { HelpProvider } from "@/hooks/use-help";
import { GoogleMapsProvider } from "@/hooks/use-google-maps";
import { FirebaseClientProvider } from "@/lib/firebase/client-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
      <FirebaseClientProvider>
        <UserProvider>
          <HelpProvider>
            <GoogleMapsProvider>
              {children}
            </GoogleMapsProvider>
          </HelpProvider>
        </UserProvider>
      </FirebaseClientProvider>
    </ThemeProvider>
  );
}
