
"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { getFirebaseApp, type FirebaseApp } from './use-firebase-app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

interface FirebaseContextValue {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
}

const FirebaseContext = createContext<FirebaseContextValue | null>(null);

export const FirebaseClientProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [contextValue, setContextValue] = useState<FirebaseContextValue | null>(null);

  useEffect(() => {
    const app = getFirebaseApp();
    const auth = getAuth(app);
    const db = getFirestore(app);
    setContextValue({ app, auth, db });
  }, []);

  if (!contextValue) {
    // You can return a loading spinner here if needed
    return null;
  }

  return (
    <FirebaseContext.Provider value={contextValue}>
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
