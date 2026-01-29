
"use client";

import React, { createContext, useContext, useMemo } from 'react';
import { app, auth, db, storage } from '@/infrastructure/firebase/client';
import { FirebaseApp } from 'firebase/app';
import { Auth } from 'firebase/auth';
import { Firestore } from 'firebase/firestore';
import { FirebaseStorage } from 'firebase/storage';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';

// --- Types ---
interface FirebaseContextValue {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  storage: FirebaseStorage;
}

// --- Context ---
const FirebaseContext = createContext<FirebaseContextValue | null>(null);

export const FirebaseClientProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // --- Firebase Initialization (Client-Side) ---
  const firebaseContextValue = useMemo(() => {
    return { app, auth, db, storage };
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

export const useStorage = () => {
  const context = useContext(FirebaseContext);
  if (!context) {
    throw new Error("useStorage must be used within a FirebaseClientProvider");
  }
  return context.storage;
}
