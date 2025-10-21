
"use client";

import React from 'react';
import { FirebaseProvider } from "@/hooks/use-user";
import { HelpProvider } from "@/hooks/use-help";
import { GoogleMapsProvider } from "@/hooks/use-google-maps";
import { FirebaseErrorListener } from "../FirebaseErrorListener";

/**
 * A lightweight provider component for pages that need access to Firebase services
 * but do not require an authenticated user, such as the login and sign-up pages.
 * It excludes the UserProvider to prevent blocking rendering.
 */
export function AuthPageProviders({ children }: { children: React.ReactNode }) {
  return (
      <FirebaseProvider>
        <HelpProvider>
          <GoogleMapsProvider>
            {children}
            <FirebaseErrorListener />
          </GoogleMapsProvider>
        </HelpProvider>
      </FirebaseProvider>
  );
}
