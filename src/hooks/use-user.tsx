
"use client";

import { User, BlacklistEntry } from "@/lib/types";
import { usePathname, useRouter } from "next/navigation";
import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import { onAuthStateChanged, signOut, signInWithEmailAndPassword, User as FirebaseUser, initializeAuth, browserLocalPersistence, type Auth } from "firebase/auth";
import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { doc, getDoc, collection, getDocs, onSnapshot, getFirestore, type Firestore, query, where } from "firebase/firestore";
import { Loader2 } from "lucide-react";
import { useToast } from "./use-toast";

// --- Firebase App Initialization (Client-side) ---

let firebaseApp: FirebaseApp;

function getFirebaseApp(): FirebaseApp {
  if (firebaseApp) {
    return firebaseApp;
  }

  if (getApps().length === 0) {
    const firebaseConfig = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    };
    firebaseApp = initializeApp(firebaseConfig);
  } else {
    firebaseApp = getApp();
  }
  return firebaseApp;
}

// --- Firebase Context ---

interface FirebaseInstances {
  auth: Auth;
  db: Firestore;
  app: FirebaseApp;
}

const FirebaseContext = createContext<FirebaseInstances | null>(null);

const FirebaseProvider = ({ children }: { children: React.ReactNode }) => {
    const [instances, setInstances] = useState<FirebaseInstances | null>(null);

    useEffect(() => {
        const app = getFirebaseApp();
        const auth = initializeAuth(app, { persistence: browserLocalPersistence });
        const db = getFirestore(app);
        setInstances({ auth, db, app });
    }, []);

    if (!instances) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Initializing...</span>
                </div>
            </div>
        );
    }
    return <FirebaseContext.Provider value={instances}>{children}</FirebaseContext.Provider>;
}

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
  const { auth, db } = useFirebase();
  const [user, setUser] = useState<User | null>(null);
  const [role, setRoleState] = useState<Role>("Job Giver");
  const [isAdmin, setIsAdmin] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [roleLoading, setRoleLoading] = useState(true);

  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

   const updateUserState = useCallback((userData: User | null) => {
    setRoleLoading(true);
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
    setRoleLoading(false);
  }, []);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      setAuthLoading(true);
      if (firebaseUser) {
        const userDocRef = doc(db, "users", firebaseUser.uid);
        
        const unsubscribeDoc = onSnapshot(userDocRef, async (userDoc) => {
           if (userDoc.exists()) {
             const userData = { id: userDoc.id, ...userDoc.data() } as User;
             
             const blacklistQuery = query(collection(db, "blacklist"), where("value", "==", firebaseUser.uid), where("type", "==", "user"));
             const blacklistSnapshot = await getDocs(blacklistQuery);
             const isBlacklisted = !blacklistSnapshot.empty;
             
             if (isBlacklisted) {
               toast({ title: 'Access Denied', description: `Your account is currently restricted.`, variant: 'destructive' });
               signOut(auth);
               updateUserState(null);
             } else {
                 updateUserState(userData);
             }
           } else {
             console.error("User document not found for authenticated user:", firebaseUser.uid);
             signOut(auth);
             updateUserState(null);
           }
           setAuthLoading(false);
        }, (error) => {
            console.error("Error listening to user document:", error);
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

    return () => unsubscribeAuth();
  }, [auth, db, toast, updateUserState]);


  useEffect(() => {
    const isPublicPage = publicPaths.some(p => pathname.startsWith(p));
    if (authLoading || (roleLoading && !isPublicPage)) return;

    if (!user && !isPublicPage) {
        router.push('/login');
        return;
    }

    if (user && !isPublicPage) {
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
  }, [role, pathname, user, router, authLoading, roleLoading]);


  const login = async (email: string, password?: string) => {
    if (!password) {
        return false;
    }
    setAuthLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
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
    setAuthLoading(true);
    await signOut(auth);
    updateUserState(null);
    router.push('/login');
    setAuthLoading(false);
  };

  const setRole = (newRole: Role) => {
    if (user && user.roles.includes(newRole)) {
      setRoleState(newRole);
      localStorage.setItem('userRole', newRole);
    }
  };
  
  const isLoadingOverall = authLoading || (roleLoading && !publicPaths.some(p => pathname.startsWith(p)));

  const value = useMemo(() => ({
    user,
    role,
    isAdmin,
    loading: isLoadingOverall,
    setUser,
    setRole,
    login,
    logout
  }), [user, role, isAdmin, isLoadingOverall, login, logout, setRole, setUser]);

  return (
    <UserContext.Provider value={value}>
      {isLoadingOverall ? (
         <div className="flex h-screen items-center justify-center">
            <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Loading user...</span>
            </div>
        </div>
      ) : children }
    </UserContext.Provider>
  );
};

export const UserProvider = ({ children }: { children: React.ReactNode }) => (
    <FirebaseProvider>
        <UserProviderComponent>{children}</UserProviderComponent>
    </FirebaseProvider>
);


export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};
