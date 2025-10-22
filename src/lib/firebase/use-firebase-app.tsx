
"use client";

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import React, { createContext, useContext } from 'react';

// --- Firebase Initialization (Client-Side) ---

let firebaseApp: FirebaseApp;

/**
 * Creates and returns the Firebase app instance on the client-side.
 * Ensures that initialization only happens once.
 */
export function getFirebaseApp(): FirebaseApp {
  if (firebaseApp) {
    return firebaseApp;
  }

  // Check if apps are already initialized (e.g., during HMR)
  if (getApps().length === 0) {
    const firebaseConfig = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
    };
    
    if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
       console.error("Firebase config is missing or incomplete. Make sure you have set up your .env.local file correctly.");
       // This will cause the SDK to throw a more specific error, which is desired.
    }

    firebaseApp = initializeApp(firebaseConfig);
  } else {
    firebaseApp = getApp();
  }

  return firebaseApp;
}

// --- React Context for sharing the app instance (Optional but good practice) ---

const FirebaseAppContext = createContext<FirebaseApp | null>(null);

/**
 * A provider component that makes the Firebase app instance available to its children.
 * This is now simplified and just passes down the result of getFirebaseApp().
 */
export const FirebaseAppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const app = getFirebaseApp();
    return (
        <FirebaseAppContext.Provider value={app}>
            {children}
        </FirebaseAppContext.Provider>
    );
};

/**
 * A hook to access the Firebase app instance from within the FirebaseAppProvider.
 */
export const useFirebaseApp = () => {
  const context = useContext(FirebaseAppContext);
  if (context === undefined) {
    throw new Error("useFirebaseApp must be used within a FirebaseAppProvider");
  }
  if (!context) {
    throw new Error("Firebase app not available. Ensure FirebaseAppProvider is set up correctly.");
  }
  return context;
};
