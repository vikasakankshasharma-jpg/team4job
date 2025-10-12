
"use client";

import React, { useEffect, useState } from 'react';
import { UserProvider } from "@/hooks/use-user";
import { ThemeProvider } from "@/components/theme-provider";
import { HelpProvider } from "@/hooks/use-help";
import { GoogleMapsProvider } from "@/hooks/use-google-maps";
import { FirebaseErrorListener } from "./FirebaseErrorListener";
import { getFirebaseApp, FirebaseAppContext } from "@/lib/firebase/use-firebase-app";
import { FirebaseApp } from 'firebase/app';

function FirebaseAppContextProvider({ children }: { children: React.ReactNode }) {
    const [app, setApp] = useState<FirebaseApp | null>(null);

    useEffect(() => {
        setApp(getFirebaseApp());
    }, []);

    return (
        <FirebaseAppContext.Provider value={app}>
            {children}
        </FirebaseAppContext.Provider>
    );
}

export function Providers({ children }: { children: React.ReactNode }) {

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
      <FirebaseAppContextProvider>
        <UserProvider>
          <HelpProvider>
            <GoogleMapsProvider>
              {children}
              <FirebaseErrorListener />
            </GoogleMapsProvider>
          </HelpProvider>
        </UserProvider>
      </FirebaseAppContextProvider>
    </ThemeProvider>
  );
}
