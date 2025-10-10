
"use client";

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';

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
       console.error("Firebase config is missing. Check your .env file.");
       // Return a dummy object or throw an error, depending on desired strictness.
       // For now, we proceed, but the SDK will throw the api-key-not-valid error.
    }

    firebaseApp = initializeApp(firebaseConfig);
  } else {
    firebaseApp = getApp();
  }
  return firebaseApp;
}

export const FirebaseAppProvider = ({ children }: { children: React.ReactNode }) => {
    const [app, setApp] = useState<FirebaseApp | null>(null);

    useEffect(() => {
        // The initialization is deferred until the component mounts on the client.
        setApp(getFirebaseApp());
    }, []);

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
