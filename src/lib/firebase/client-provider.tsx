
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

interface FirebaseClientProviderProps {
  children: React.ReactNode;
  firebaseConfig: {
    apiKey?: string;
    authDomain?: string;
    projectId?: string;
    storageBucket?: string;
    messagingSenderId?: string;
    appId?: string;
  };
}

export function FirebaseClientProvider({ children, firebaseConfig }: FirebaseClientProviderProps) {
  const [firebaseInstances, setFirebaseInstances] = useState<FirebaseContextType | null>(null);

  useEffect(() => {
    if (!firebaseConfig.apiKey) {
      console.error("Firebase API Key is missing. The application will not work correctly.");
      return;
    }

    let app: FirebaseApp;
    if (getApps().length === 0) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApp();
    }

    const auth = getAuth(app);
    const db = getFirestore(app);

    setFirebaseInstances({ app, auth, db });
  }, [firebaseConfig]);

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
