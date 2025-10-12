
"use client";

import { User, BlacklistEntry } from "@/lib/types";
import { usePathname, useRouter } from "next/navigation";
import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import { onAuthStateChanged, signOut, signInWithEmailAndPassword, User as FirebaseUser, initializeAuth, browserLocalPersistence, type Auth } from "firebase/auth";
import { doc, getDoc, collection, getDocs, onSnapshot, getFirestore, type Firestore } from "firebase/firestore";
import { Loader2 } from "lucide-react";
import { useToast } from "./use-toast";
import { useFirebaseApp, getFirebaseApp } from "@/lib/firebase/use-firebase-app";

type Role = "Job Giver" | "Installer" | "Admin";

interface FirebaseInstances {
  auth: Auth;
  db: Firestore;
}

type UserContextType = {
  user: User | null;
  role: Role;
  isAdmin: boolean;
  loading: boolean;
  firebase: FirebaseInstances | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  setRole: (role: Role) => void;
  login: (email: string, password?: string) => Promise<boolean>;
  logout: () => void;
};

const UserContext = createContext<UserContextType | null>(null);

const installerPaths = ['/dashboard/my-bids', '/dashboard/jobs'];
const jobGiverPaths = ['/dashboard/posted-jobs', '/dashboard/post-job'];
const publicPaths = ['/login', '/'];

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const app = useFirebaseApp();
  const [user, setUser] = useState<User | null>(null);
  const [role, setRoleState] = useState<Role>("Installer");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [firebase, setFirebase] = useState<FirebaseInstances | null>(null);

  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

   useEffect(() => {
    if (app) {
        const auth = initializeAuth(app, { persistence: browserLocalPersistence });
        const db = getFirestore(app);
        setFirebase({ auth, db });
    }
  }, [app]);

   const updateUserState = useCallback((userData: User | null) => {
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
  }, []);

  useEffect(() => {
    if (!firebase) return;
    
    const { auth, db } = firebase;

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      setLoading(true);
      if (firebaseUser) {
        const userDocRef = doc(db, "users", firebaseUser.uid);
        
        const unsubscribeDoc = onSnapshot(userDocRef, async (userDoc) => {
           if (userDoc.exists()) {
             const userData = { id: userDoc.id, ...userDoc.data() } as User;
             
             const blacklistSnapshot = await getDocs(collection(db, "blacklist"));
             const blacklist = blacklistSnapshot.docs.map(doc => doc.data() as BlacklistEntry);
             const userBlacklistEntry = blacklist.find(entry => entry.type === 'user' && entry.value === firebaseUser.uid);
             const isBlacklisted = userBlacklistEntry && (userBlacklistEntry.role === 'Any' || userData.roles.includes(userBlacklistEntry.role as any));
             
             if (isBlacklisted) {
               toast({ title: 'Access Denied', description: `Your account is currently restricted. Reason: ${userBlacklistEntry.reason}`, variant: 'destructive' });
               await signOut(auth);
               updateUserState(null);
             } else if (userData.status === 'deactivated' || (userData.status === 'suspended' && userData.suspensionEndDate && new Date() < (userData.suspensionEndDate as any).toDate())) {
                 let message = 'Your account has been deactivated.';
                 if (userData.status === 'suspended') {
                     message = `Your account is suspended until ${new Date(userData.suspensionEndDate as any).toLocaleString()}.`;
                 }
                 toast({ title: 'Access Denied', description: message, variant: 'destructive' });
                 await signOut(auth);
                 updateUserState(null);
             } else {
                 updateUserState(userData);
             }
           } else {
             console.error("User document not found for authenticated user:", firebaseUser.uid);
             await signOut(auth);
             updateUserState(null);
           }
           setLoading(false);
        }, (error) => {
            console.error("Error listening to user document:", error);
            signOut(auth);
            updateUserState(null);
            setLoading(false);
        });

        return () => unsubscribeDoc();
      } else {
        updateUserState(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, [firebase, toast, updateUserState]);


  useEffect(() => {
    if (loading) return;

    const isPublicPage = publicPaths.some(p => pathname.startsWith(p));
    
    if (!user && !isPublicPage) {
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
    if (!firebase) return false;
    
    if (!password) {
        return false;
    }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(firebase.auth, email, password);
      return true;
    } catch (error: any) {
      if (error.code !== 'auth/invalid-credential') {
        console.error("Login failed:", error);
      }
      setLoading(false);
      return false;
    }
  };

  const logout = async () => {
    if (!firebase) return;
    setLoading(true);
    await signOut(firebase.auth);
    updateUserState(null);
    router.push('/login');
    setLoading(false);
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
    firebase,
    setUser,
    setRole,
    login,
    logout
  }), [user, role, isAdmin, loading, firebase, login, logout, setRole]);

  if (!firebase) {
     return (
        <div className="flex h-screen items-center justify-center">
            <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Initializing...</span>
            </div>
        </div>
      );
  }

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};

// This function is now part of UserProvider, but we keep the export for any components that might use it directly.
export const useFirebase = () => {
  const context = useContext(UserContext);
  if (!context || !context.firebase) {
    throw new Error("useFirebase must be used within a UserProvider and after Firebase has initialized.");
  }
  return context.firebase;
}
