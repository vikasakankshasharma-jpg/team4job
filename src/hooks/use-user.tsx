
"use client";

import { User, BlacklistEntry } from "@/lib/types";
import { usePathname, useRouter } from "next/navigation";
import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from "react";
import { onAuthStateChanged, signOut, signInWithEmailAndPassword, User as FirebaseUser } from "firebase/auth";
import { getDoc, collection, getDocs, onSnapshot, query, where, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { Loader2 } from "lucide-react";
import { useToast } from "./use-toast";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { useAuth, useFirestore, useFirebase } from "@/lib/firebase/client-provider";
import { toDate } from "@/lib/utils";

// --- Types ---
type Role = "Job Giver" | "Installer" | "Admin" | "Support Team";

interface UserContextType {
  user: User | null;
  role: Role;
  isAdmin: boolean;
  loading: boolean;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  setRole: (role: Role) => void;
  logout: () => void;
  login: (email: string, password?: string) => Promise<boolean>;
}

// --- React Context and Provider ---

const UserContext = createContext<UserContextType | null>(null);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const auth = useAuth();
  const db = useFirestore();

  const [user, setUser] = useState<User | null>(null);
  const [role, setRoleState] = useState<Role>("Job Giver");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const notFoundRetries = useRef(new Map<string, number>());

  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const updateUserState = useCallback((userData: User | null) => {
    setLoading(true);
    setUser(userData);
    if (userData) {
      const storedRole = localStorage.getItem('userRole') as Role;
      const isAdminUser = userData.roles.includes("Admin");
      setIsAdmin(isAdminUser);

      if (isAdminUser) {
        setRoleState("Admin");
        localStorage.setItem('userRole', "Admin");
      } else if (userData.roles.includes("Support Team")) {
        setRoleState("Support Team");
        localStorage.setItem('userRole', "Support Team");
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
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!auth || !db) return;

    errorEmitter.on('permission-error', (error: FirestorePermissionError) => {
      console.error("Intercepted Firestore Permission Error:", error);
      toast({
        title: "Permission Denied",
        description: `You do not have permission to perform this action. The operation for path '${error.context.path}' was denied.`,
        variant: "destructive"
      });
    });

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      setLoading(true);
      if (firebaseUser) {
        const userDocRef = doc(db, "users", firebaseUser.uid);
        
        const unsubscribeDoc = onSnapshot(userDocRef, async (userDoc) => {
           if (userDoc.exists()) {
             const userData = { id: userDoc.id, ...userDoc.data() } as User;
             notFoundRetries.current.delete(firebaseUser.uid);
             
             const blacklistQuery = query(collection(db, "blacklist"), where("value", "==", firebaseUser.uid), where("type", "==", "user"));
             const blacklistSnapshot = await getDocs(blacklistQuery);
             
             if (!blacklistSnapshot.empty || userData.status === 'deactivated' || (userData.status === 'suspended' && userData.suspensionEndDate && toDate(userData.suspensionEndDate) > new Date())) {
                toast({ title: 'Access Denied', description: `Your account is currently restricted.`, variant: 'destructive' });
                signOut(auth).then(() => updateUserState(null));
             } else {
                updateUserState(userData);
                // Update last login timestamp without triggering a full re-render cycle
                if (userDoc.data().lastLoginAt === undefined || (Date.now() - toDate(userDoc.data().lastLoginAt).getTime()) > 5 * 60 * 1000) {
                  updateDoc(userDocRef, { lastLoginAt: serverTimestamp() });
                }
             }
           } else {
              const currentRetries = notFoundRetries.current.get(firebaseUser.uid) || 0;
              if (currentRetries < 3) { // Increased retries to 3
                  notFoundRetries.current.set(firebaseUser.uid, currentRetries + 1);
                  return; // Wait for next snapshot
              }
             
             console.error("User document not found for authenticated user after retries:", firebaseUser.uid);
             notFoundRetries.current.delete(firebaseUser.uid);
             toast({ title: 'Login Error', description: 'Could not find your user profile. Please contact support.', variant: 'destructive' });
             signOut(auth).then(() => updateUserState(null));
           }
           setLoading(false);
        }, (error) => {
            console.error("Error listening to user document:", error);
            signOut(auth).then(() => updateUserState(null));
            setLoading(false);
        });

        return () => unsubscribeDoc();
      } else {
        updateUserState(null);
        setLoading(false);
      }
    });

    return () => {
        unsubscribeAuth();
        errorEmitter.removeAllListeners('permission-error');
    }
  }, [auth, db, toast, updateUserState]);

  useEffect(() => {
    if (loading) return;
    
    const publicPaths = ['/login', '/'];
    const isPublicPage = publicPaths.some(p => pathname === p) || pathname.startsWith('/login');

    if (isPublicPage) {
        if (user) {
            router.push('/dashboard');
        }
        return;
    }

    if (!user) {
        router.push('/login');
        return;
    }

    // Role-based route protection
    const installerPaths = ['/dashboard/jobs', '/dashboard/my-bids', '/dashboard/verify-installer'];
    const jobGiverPaths = ['/dashboard/post-job', '/dashboard/posted-jobs', '/dashboard/my-installers', '/dashboard/installers'];
    const adminOnlyPaths = ['/dashboard/reports', '/dashboard/users', '/dashboard/team', '/dashboard/all-jobs', '/dashboard/transactions', '/dashboard/settings', '/dashboard/subscription-plans', '/dashboard/coupons', '/dashboard/blacklist'];
    const supportOnlyPaths = ['/dashboard/disputes'];
    
    const isInstallerPage = installerPaths.some(p => pathname.startsWith(p));
    const isJobGiverPage = jobGiverPaths.some(p => pathname.startsWith(p));
    const isAdminPage = adminOnlyPaths.some(p => pathname.startsWith(p));
    const isSupportPage = supportOnlyPaths.some(p => pathname.startsWith(p));

    const userIsAdmin = user.roles.includes("Admin");

    if (role === 'Job Giver' && isInstallerPage) {
        router.push('/dashboard');
    } else if (role === 'Installer' && isJobGiverPage) {
        router.push('/dashboard');
    } else if (role === 'Support Team' && !(isSupportPage || pathname === '/dashboard' || pathname.startsWith('/dashboard/profile'))) {
        router.push('/dashboard/disputes');
    } else if (!userIsAdmin && isAdminPage) {
        router.push('/dashboard');
    }

  }, [role, pathname, user, router, loading]);


  const handleSetRole = (newRole: Role) => {
    if (user && user.roles.includes(newRole)) {
      setRoleState(newRole);
      localStorage.setItem('userRole', newRole);
    }
  };

  const handleLogout = () => {
      signOut(auth).then(() => {
          updateUserState(null);
          router.push('/login');
      });
  }

  const handleLogin = async (email: string, password?: string): Promise<boolean> => {
    if (!password) {
        console.error("Password missing.");
        return false;
    }
    try {
        await signInWithEmailAndPassword(auth, email, password);
        return true;
    } catch (error: any) {
        if (error.code !== 'auth/invalid-credential') {
            console.error("Login failed:", error);
        }
        return false;
    }
  };


  const value = useMemo(() => ({
    user,
    role,
    isAdmin,
    loading,
    setUser,
    setRole: handleSetRole,
    logout: handleLogout,
    login: handleLogin,
  }), [user, role, isAdmin, loading, setUser]);
  
  const publicPaths = ['/login', '/'];
  const isPublicPage = publicPaths.some(p => pathname.startsWith(p));

  if (loading && !isPublicPage) {
      return (
         <div className="flex h-screen items-center justify-center">
            <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Loading user...</span>
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

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};

// This is kept for non-hook usage, but useAuth and useFirestore are preferred.
export { useFirebase, useAuth, useFirestore };
