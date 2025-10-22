
"use client";

import React, { createContext, useContext } from 'react';
import { getFirebaseApp, type FirebaseApp } from './use-firebase-app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

interface FirebaseContextValue {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
}

// Initialize Firebase immediately at the module level.
// This ensures that the instances are ready before any component renders.
const app = getFirebaseApp();
const auth = getAuth(app);
const db = getFirestore(app);

const firebaseContextValue: FirebaseContextValue = { app, auth, db };

const FirebaseContext = createContext<FirebaseContextValue | null>(null);

export const FirebaseClientProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // The value is now constant and created outside the component,
  // so we don't need useState or useEffect.
  return (
    <FirebaseContext.Provider value={firebaseContextValue}>
      {children}
    </FirebaseContext.Provider>
  );
};

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
