
"use client";

import React, { createContext, useContext, useMemo } from 'react';
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';

// --- Types ---
interface FirebaseContextValue {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
}

// --- Context ---
const FirebaseContext = createContext<FirebaseContextValue | null>(null);

export const FirebaseClientProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // --- Firebase Initialization (Client-Side) ---
  const firebaseContextValue = useMemo(() => {
    const firebaseConfig = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    };

    if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
      throw new Error("Firebase config is missing or incomplete. Make sure NEXT_PUBLIC_FIREBASE_* environment variables are set.");
    }

    const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    const auth = getAuth(app);
    const db = getFirestore(app);

    return { app, auth, db };
  }, []);

  return (
    <FirebaseContext.Provider value={firebaseContextValue}>
      {children}
      <FirebaseErrorListener />
    </FirebaseContext.Provider>
  );
};

// --- Hooks ---
export const useFirebase = () => {
    const context = useContext(FirebaseContext);
    if (!context) {
        throw new Error("useFirebase must be used within a FirebaseClientProvider");
    }
    return context;
}

export const useAuth = () => {
  const context = useContext(FirebaseContext);
  if (!context) {
    throw new Error("useAuth must be used within a FirebaseClientProvider");
  }
  return context.auth;
}

export const useFirestore = () => {
    const context = useContext(FirebaseContext);
    if (!context) {
        throw new Error("useFirestore must be used within a FirebaseClientProvider");
    }
    return context.db;
}
