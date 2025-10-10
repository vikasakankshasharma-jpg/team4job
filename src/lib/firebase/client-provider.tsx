
"use client";

import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { Loader2 } from "lucide-react";

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
  const [instances, setInstances] = useState<FirebaseContextType | null>(null);

  useEffect(() => {
    if (!firebaseConfig.apiKey) {
      console.error("Firebase API Key is missing. The application will not work correctly.");
      return;
    }

    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    const auth = getAuth(app);
    const db = getFirestore(app);
    
    setInstances({ app, auth, db });
  }, [firebaseConfig]);

  if (!instances) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Initializing Firebase...</span>
        </div>
      </div>
    );
  }

  return (
    <FirebaseContext.Provider value={instances}>
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
