
"use client";

import { UserProvider } from "@/hooks/use-user";
import { ThemeProvider } from "@/components/theme-provider";
import { HelpProvider } from "@/hooks/use-help";
import { GoogleMapsProvider } from "@/hooks/use-google-maps";
import { FirebaseClientProvider } from "@/lib/firebase/client-provider";
import { FirebaseErrorListener } from "./FirebaseErrorListener";

export function Providers({ children }: { children: React.ReactNode }) {
  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
      <FirebaseClientProvider firebaseConfig={firebaseConfig}>
        <FirebaseErrorListener />
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
