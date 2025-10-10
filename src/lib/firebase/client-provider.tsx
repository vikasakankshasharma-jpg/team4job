
"use client";

import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

interface FirebaseContextType {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
}

const FirebaseContext = createContext<FirebaseContextType | null>(null);

// This function must be called on the client side.
function initializeFirebase() {
  if (getApps().length > 0) {
    return {
      app: getApp(),
      auth: getAuth(getApp()),
      db: getFirestore(getApp()),
    };
  }

  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

  if (!firebaseConfig.apiKey) {
    throw new Error("Firebase API Key is missing. Check your environment variables.");
  }
  
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  return { app, auth, db };
}

export function FirebaseClientProvider({ children }: { children: React.ReactNode }) {
  const [firebaseInstances, setFirebaseInstances] = useState<FirebaseContextType | null>(null);

  useEffect(() => {
    // This effect runs only on the client, after the component mounts.
    // This ensures that process.env variables are available.
    if (typeof window !== "undefined") {
      const instances = initializeFirebase();
      setFirebaseInstances(instances);
    }
  }, []);

  const value = useMemo(() => firebaseInstances, [firebaseInstances]);

  if (!value) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground">Initializing Firebase...</p>
      </div>
    );
  }

  return (
    <FirebaseContext.Provider value={value}>
      {children}
    </FirebaseContext.Provider>
  );
}

export const useFirebase = () => {
  const context = useContext(FirebaseContext);
  if (!context) {
    throw new Error("useFirebase must be used within a FirebaseClientProvider");
  }
  return context;
};
