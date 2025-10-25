
"use client";

import React from 'react';
import { HelpProvider } from "@/hooks/use-help";
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
            {children}
            <FirebaseErrorListener />
          </HelpProvider>
        </UserProvider>
      </FirebaseClientProvider>
  );
}
