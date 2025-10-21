
"use client";

import React from 'react';
import { UserProvider, FirebaseProvider } from "@/hooks/use-user";
import { HelpProvider } from "@/hooks/use-help";
import { GoogleMapsProvider } from "@/hooks/use-google-maps";
import { FirebaseErrorListener } from "./FirebaseErrorListener";

export function Providers({ children }: { children: React.ReactNode }) {

  return (
      <FirebaseProvider>
        <UserProvider>
            <HelpProvider>
              <GoogleMapsProvider>
                {children}
                <FirebaseErrorListener />
              </GoogleMapsProvider>
            </HelpProvider>
        </UserProvider>
      </FirebaseProvider>
  );
}
