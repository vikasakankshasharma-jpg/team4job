
"use client";

import { User, BlacklistEntry } from "@/lib/types";
import { usePathname, useRouter } from "next/navigation";
import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from "react";
import { onAuthStateChanged, signOut, signInWithEmailAndPassword, User as FirebaseUser, initializeAuth, browserLocalPersistence, type Auth } from "firebase/auth";
import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { doc, getDoc, collection, getDocs, onSnapshot, getFirestore, type Firestore, query, where } from "firebase/firestore";
import { Loader2 } from "lucide-react";
import { useToast } from "./use-toast";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { useFirebaseApp } from "@/lib/firebase/use-firebase-app";

// --- Firebase Context ---

interface FirebaseInstances {
  auth: Auth;
  db: Firestore;
  app: FirebaseApp;
}

const FirebaseContext = createContext<FirebaseInstances | null>(null);

export const useFirebase = () => {
    const context = useContext(FirebaseContext);
    if (!context) {
        throw new Error("useFirebase must be used within a FirebaseProvider");
    }
    return context;
};


// --- User Context ---

type Role = "Job Giver" | "Installer" | "Admin";

type UserContextType = {
  user: User | null;
  role: Role;
  isAdmin: boolean;
  loading: boolean;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  setRole: (role: Role) => void;
  login: (email: string, password?: string) => Promise<boolean>;
  logout: () => void;
};

const UserContext = createContext<UserContextType | null>(null);

const publicPaths = ['/login', '/'];
const installerPaths = ['/dashboard/jobs', '/dashboard/my-bids'];
const jobGiverPaths = ['/dashboard/post-job', '/dashboard/posted-jobs'];


function UserProviderComponent({ children }: { children: React.ReactNode }) {
  const app = useFirebaseApp();
  const [firebaseInstances, setFirebaseInstances] = useState<FirebaseInstances | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRoleState] = useState<Role>("Job Giver");
  const [isAdmin, setIsAdmin] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [userDocLoading, setUserDocLoading] = useState(true);
  const notFoundRetries = useRef(new Map<string, number>());

  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

   useEffect(() => {
    if (app) {
        const auth = initializeAuth(app, { persistence: browserLocalPersistence });
        const db = getFirestore(app);
        setFirebaseInstances({ auth, db, app });
    }
  }, [app]);


   const updateUserState = useCallback((userData: User | null) => {
    setUserDocLoading(true);
    setUser(userData);
    if (userData) {
      const storedRole = localStorage.getItem('userRole') as Role;
      const isAdminUser = userData.roles.includes("Admin");
      setIsAdmin(isAdminUser);

      if (isAdminUser) {
        setRoleState("Admin");
        localStorage.setItem('userRole', "Admin");
      } else if (storedRole && userData.roles.includes(storedRole)) {
        setRoleState(storedRole);
      } else {
        const initialRole = userData.roles.includes("Installer") ? "Installer" : "Job Giver";
        setRoleState(initialRole);
        localStorage.setItem('userRole', initialRole);
      }
    } else {
      setIsAdmin(false);
      localStorage.removeItem('userRole');
    }
    setUserDocLoading(false);
  }, []);

  useEffect(() => {
    if (!firebaseInstances) return;
    const { auth, db } = firebaseInstances;

    errorEmitter.on('permission-error', (error: FirestorePermissionError) => {
      console.error("Intercepted Firestore Permission Error:", error);
      toast({
        title: "Permission Denied",
        description: `You do not have permission to perform this action. The operation for path '${error.context.path}' was denied.`,
        variant: "destructive"
      });
    });

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      setAuthLoading(true);
      if (firebaseUser) {
        const userDocRef = doc(db, "users", firebaseUser.uid);
        
        const unsubscribeDoc = onSnapshot(userDocRef, async (userDoc) => {
           if (userDoc.exists()) {
             const userData = { id: userDoc.id, ...userDoc.data() } as User;
             notFoundRetries.current.delete(firebaseUser.uid); // Clear retries on success
             
             const blacklistQuery = query(collection(db, "blacklist"), where("value", "==", firebaseUser.uid), where("type", "==", "user"));
             const blacklistSnapshot = await getDocs(blacklistQuery);
             
             if (!blacklistSnapshot.empty) {
                toast({ title: 'Access Denied', description: `Your account is currently restricted.`, variant: 'destructive' });
                signOut(auth);
                updateUserState(null);
             } else {
                updateUserState(userData);
             }
           } else {
              const currentRetries = notFoundRetries.current.get(firebaseUser.uid) || 0;
              if (currentRetries < 1) { // Allow only one retry attempt
                  notFoundRetries.current.set(firebaseUser.uid, currentRetries + 1);
                  console.warn(`User document for ${firebaseUser.uid} not found. Retrying in 2 seconds...`);
                  setTimeout(() => {
                      // The onSnapshot listener will be triggered again automatically by any change,
                      // but we don't need to do anything here, just wait.
                  }, 2000);
                  // Don't log out yet, wait for retry
                  return;
              }
             
             console.error("User document not found for authenticated user:", firebaseUser.uid);
             notFoundRetries.current.delete(firebaseUser.uid); // Clean up after final failure
             signOut(auth);
             updateUserState(null);
           }
           setAuthLoading(false);
        }, (error) => {
            console.error("Error listening to user document:", error);
            if (error.code === 'permission-denied') {
                errorEmitter.emit('permission-error', new FirestorePermissionError({
                  path: error.toString(), // or a more specific path if available
                  operation: 'get'
                }));
            }
            signOut(auth);
            updateUserState(null);
            setAuthLoading(false);
        });

        return () => unsubscribeDoc();
      } else {
        updateUserState(null);
        setAuthLoading(false);
      }
    });

    return () => {
        unsubscribeAuth();
        errorEmitter.removeAllListeners('permission-error');
    }
  }, [firebaseInstances, toast, updateUserState]);

  const loading = authLoading || userDocLoading || !firebaseInstances;

  useEffect(() => {
    const isPublicPage = publicPaths.some(p => pathname.startsWith(p));
    if (loading || isPublicPage) return;

    if (!user) {
        router.push('/login');
        return;
    }

    if (user) {
        if (pathname === '/login') {
            router.push('/dashboard');
        }
        
        const isInstallerPage = installerPaths.some(p => pathname.startsWith(p));
        const isJobGiverPage = jobGiverPaths.some(p => pathname.startsWith(p));

        if (role === 'Job Giver' && isInstallerPage) {
            router.push('/dashboard');
        }
        if (role === 'Installer' && isJobGiverPage) {
            router.push('/dashboard');
        }
    }
  }, [role, pathname, user, router, loading]);


  const login = async (email: string, password?: string) => {
    if (!password || !firebaseInstances) {
        return false;
    }
    setAuthLoading(true);
    try {
      await signInWithEmailAndPassword(firebaseInstances.auth, email, password);
      // onAuthStateChanged will handle the user state update
      return true;
    } catch (error: any) {
      if (error.code !== 'auth/invalid-credential') {
        console.error("Login failed:", error);
      }
      setAuthLoading(false);
      return false;
    }
  };

  const logout = async () => {
    if (!firebaseInstances) return;
    setAuthLoading(true);
    await signOut(firebaseInstances.auth);
    updateUserState(null);
    router.push('/login');
  };

  const setRole = (newRole: Role) => {
    if (user && user.roles.includes(newRole)) {
      setRoleState(newRole);
      localStorage.setItem('userRole', newRole);
    }
  };

  const value = useMemo(() => ({
    user,
    role,
    isAdmin,
    loading,
    setUser,
    setRole,
    login,
    logout
  }), [user, role, isAdmin, loading, login, logout, setRole]);

  return (
    <UserContext.Provider value={value}>
      {loading && !publicPaths.some(p => pathname.startsWith(p)) ? (
         <div className="flex h-screen items-center justify-center">
            <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Loading user...</span>
            </div>
        </div>
      ) : firebaseInstances ? (
        <FirebaseContext.Provider value={firebaseInstances}>
          {children}
        </FirebaseContext.Provider>
      ) : (
          <div className="flex h-screen items-center justify-center">
             <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Connecting...</span>
             </div>
          </div>
      )}
    </UserContext.Provider>
  );
};

export const UserProvider = ({ children }: { children: React.ReactNode }) => (
    <UserProviderComponent>{children}</UserProviderComponent>
);


export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};
