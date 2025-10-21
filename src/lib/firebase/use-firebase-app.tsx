
"use client";

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import React, { createContext, useContext, useState, useEffect } from 'react';

const FirebaseAppContext = createContext<FirebaseApp | null>(null);

let firebaseApp: FirebaseApp;

/**
 * Creates and returns the Firebase app instance.
 * Ensures that initialization only happens once.
 */
export function getFirebaseApp(): FirebaseApp {
  if (firebaseApp) {
    return firebaseApp;
  }

  if (getApps().length === 0) {
    // This config is created dynamically when called, ensuring env vars are loaded on the client.
    const firebaseConfig = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    };
    
    // Check if all required keys are present.
    if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
       console.error("Firebase config is missing or incomplete. Check your .env file and next.config.ts. Make sure to restart the development server after changing environment variables.");
       // This will cause the SDK to throw a more specific error.
    }

    firebaseApp = initializeApp(firebaseConfig);
  } else {
    firebaseApp = getApp();
  }
  return firebaseApp;
}

export const FirebaseAppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [app, setApp] = useState<FirebaseApp | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
      try {
        // The initialization is deferred until the component mounts on the client.
        setApp(getFirebaseApp());
      } catch (e: any) {
        console.error("Firebase initialization failed:", e.message);
        setError("Failed to initialize Firebase. Please check your configuration and API keys.");
      }
    }, []);

    if (error) {
       return (
             <div className="flex h-screen items-center justify-center p-4">
                <div className="text-center text-destructive">
                    <h1 className="text-lg font-bold">Initialization Error</h1>
                    <p className="text-sm">{error}</p>
                </div>
            </div>
        );
    }
    
    if (!app) {
        return (
             <div className="flex h-screen items-center justify-center">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <span>Initializing Firebase...</span>
                </div>
            </div>
        );
    }

    return (
        <FirebaseAppContext.Provider value={app}>
            {children}
        </FirebaseAppContext.Provider>
    );
};


export const useFirebaseApp = () => {
  const context = useContext(FirebaseAppContext);
  if (context === undefined) {
    throw new Error("useFirebaseApp must be used within a FirebaseAppProvider");
  }
  return context;
};
