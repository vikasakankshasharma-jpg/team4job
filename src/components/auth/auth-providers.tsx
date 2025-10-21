"use client";

import React from 'react';
import { HelpProvider } from "@/hooks/use-help";
import { GoogleMapsProvider } from "@/hooks/use-google-maps";
import { FirebaseErrorListener } from "../FirebaseErrorListener";
import { FirebaseClientProvider } from '@/lib/firebase/client-provider';
import { UserProvider } from '@/hooks/use-user';

/**
 * A provider component for pages that need access to Firebase services,
 * including authentication forms.
 */
export function AuthPageProviders({ children }: { children: React.ReactNode }) {
  return (
      <FirebaseClientProvider>
        <UserProvider>
          <HelpProvider>
            <GoogleMapsProvider>
              {children}
              <FirebaseErrorListener />
            </GoogleMapsProvider>
          </HelpProvider>
        </UserProvider>
      </FirebaseClientProvider>
  );
}
