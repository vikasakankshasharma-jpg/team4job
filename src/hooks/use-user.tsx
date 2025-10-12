
"use client";

import { User, UserStatus, BlacklistEntry } from "@/lib/types";
import { usePathname, useRouter } from "next/navigation";
import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import { onAuthStateChanged, signOut, signInWithEmailAndPassword, User as FirebaseUser } from "firebase/auth";
import { doc, getDoc, collection, getDocs, onSnapshot } from "firebase/firestore";
import { useFirebase } from "@/lib/firebase/client-provider";
import { Loader2 } from "lucide-react";
import { useToast } from "./use-toast";

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

const installerPaths = ['/dashboard/my-bids', '/dashboard/jobs'];
const jobGiverPaths = ['/dashboard/posted-jobs', '/dashboard/post-job'];
const publicPaths = ['/login', '/'];

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRoleState] = useState<Role>("Installer");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const firebaseContext = useFirebase();
  const { toast } = useToast();

   const updateUserState = useCallback((userData: User | null) => {
    if (userData) {
      setUser(userData);
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
      setUser(null);
      setIsAdmin(false);
      localStorage.removeItem('userRole');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!firebaseContext) return;
    
    const { auth, db } = firebaseContext;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
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
        }, (error) => {
            console.error("Error listening to user document:", error);
            signOut(auth);
            updateUserState(null);
        });

        return () => unsubscribeDoc();
      } else {
        updateUserState(null);
      }
    });

    return () => unsubscribeAuth();
  }, [firebaseContext, toast, updateUserState]);


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
    if (!firebaseContext) return false;
    
    if (!password) {
        return false;
    }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(firebaseContext.auth, email, password);
      // onAuthStateChanged will handle setting the user state and setLoading(false)
      return true;
    } catch (error: any) {
      // Only log errors that are NOT invalid credentials
      if (error.code !== 'auth/invalid-credential') {
        console.error("Login failed:", error);
      }
      setLoading(false);
      return false;
    }
  };

  const logout = async () => {
    if (!firebaseContext) return;
    setLoading(true);
    await signOut(firebaseContext.auth);
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
    setUser,
    setRole,
    login,
    logout
  }), [user, role, isAdmin, loading, login, logout, setRole]);

  if (loading) {
     return (
        <div className="flex h-screen items-center justify-center">
            <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Loading...</span>
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
