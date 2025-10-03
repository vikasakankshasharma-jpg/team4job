
"use client";

import { UserProvider } from "@/hooks/use-user";
import { ThemeProvider } from "@/components/theme-provider";
import { HelpProvider } from "@/hooks/use-help";
import { GoogleMapsProvider } from "@/hooks/use-google-maps";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
      <UserProvider>
        <HelpProvider>
          <GoogleMapsProvider>
            {children}
          </GoogleMapsProvider>
        </HelpProvider>
      </UserProvider>
    </ThemeProvider>
  );
}
