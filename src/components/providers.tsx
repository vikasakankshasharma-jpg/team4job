
"use client";

import React from 'react';
import { UserProvider } from "@/hooks/use-user";
import { HelpProvider } from "@/hooks/use-help";
import { GoogleMapsProvider } from "@/hooks/use-google-maps";
import { FirebaseErrorListener } from "./FirebaseErrorListener";
import { FirebaseAppProvider } from "@/lib/firebase/use-firebase-app";

export function Providers({ children }: { children: React.ReactNode }) {

  return (
      <FirebaseAppProvider>
        <UserProvider>
            <HelpProvider>
              <GoogleMapsProvider>
                {children}
                <FirebaseErrorListener />
              </GoogleMapsProvider>
            </HelpProvider>
        </UserProvider>
      </FirebaseAppProvider>
  );
}
