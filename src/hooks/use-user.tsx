"use client";

import { User } from "@/lib/types";
import { usePathname, useRouter } from "next/navigation";
import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from "react";
import { onAuthStateChanged, signOut, signInWithEmailAndPassword, User as FirebaseUser } from "firebase/auth";
import { doc, onSnapshot, updateDoc, serverTimestamp } from "firebase/firestore";
import { Loader2 } from "lucide-react";
import { useToast } from "./use-toast";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { useAuth, useFirestore } from "@/lib/firebase/client-provider";
import { toDate } from "@/lib/utils";

// Re-export firebase hooks for convenience
export { useAuth, useFirestore, useFirebase, useStorage } from "@/lib/firebase/client-provider";

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

const UserContext = createContext<UserContextType | null>(null);


// Define public pages that don't require authentication

// Define public pages that don't require authentication
const PUBLIC_PAGES = ['/login', '/', '/privacy', '/terms', '/privacy-policy', '/terms-of-service'];

// Helper to check if a path is public
const isPublicPath = (path: string) => {
  if (!path) return false;
  // Accessing exactly /login/something is covered by startsWith
  if (path.startsWith('/login')) return true;

  // Normalize: remove trailing slash for exact matches
  const normalized = path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path;

  const isPublic = PUBLIC_PAGES.includes(normalized);
  if (!isPublic) {
    // console.log('[useUser] Protected path:', path, 'Normalized:', normalized);
  }
  return isPublic;
};

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const auth = useAuth();
  const db = useFirestore();

  const [user, setUser] = useState<User | null>(null);
  const [role, setRoleState] = useState<Role>("Job Giver");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasAuthUser, setHasAuthUser] = useState(false);

  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const manualRoleSet = useRef(false);
  const isLoggingOut = useRef(false);
  const lastRedirectPath = useRef<string | null>(null);

  const smartPush = useCallback((path: string) => {
    if (pathname === path || lastRedirectPath.current === path) return;
    console.log(`[useUser] Redirecting: ${pathname} -> ${path}`);
    lastRedirectPath.current = path;
    router.push(path);
  }, [pathname, router]);

  const updateUserState = useCallback((userData: User | null) => {
    setUser(userData);
    if (userData) {
      const storedRole = localStorage.getItem('userRole') as Role;
      const isAdminUser = userData.roles.includes("Admin");
      setIsAdmin(isAdminUser);

      if (manualRoleSet.current && storedRole && userData.roles.includes(storedRole)) {
        setRoleState(storedRole);
        return;
      }

      manualRoleSet.current = false;
      const canUseStoredRole = storedRole && userData.roles.includes(storedRole);

      if (canUseStoredRole) {
        setRoleState(storedRole);
      } else if (isAdminUser) {
        setRoleState("Admin");
        localStorage.setItem('userRole', "Admin");
      } else if (userData.roles.includes("Support Team")) {
        setRoleState("Support Team");
        localStorage.setItem('userRole', "Support Team");
      } else {
        const initialRole = userData.roles.includes("Installer") ? "Installer" : "Job Giver";
        setRoleState(initialRole);
        localStorage.setItem('userRole', initialRole);
      }
    } else {
      setIsAdmin(false);
      manualRoleSet.current = false;
      localStorage.removeItem('userRole');
    }
  }, []);

  useEffect(() => {
    if (!auth || !db) return;

    // Reset redirect tracking on path change
    lastRedirectPath.current = null;

    const handlePermissionError = (error: FirestorePermissionError) => {
      console.error("Firestore Permission Error:", error);
      toast({
        title: "Permission Denied",
        description: "You do not have permission to perform this action.",
        variant: "destructive"
      });
    };

    errorEmitter.on('permission-error', handlePermissionError);

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (isLoggingOut.current) return;

      if (firebaseUser) {
        setHasAuthUser(true);
        setLoading(true);
        const userDocRef = doc(db, "users", firebaseUser.uid);
        const unsubscribeDoc = onSnapshot(userDocRef, async (userDoc) => {
          if (userDoc.exists()) {
            const userData = { id: userDoc.id, ...userDoc.data() } as User;
            if (userData.status === 'deactivated' || (userData.status === 'suspended' && userData.suspensionEndDate && toDate(userData.suspensionEndDate) > new Date())) {
              toast({ title: 'Access Denied', description: "Your account is restricted.", variant: 'destructive' });
              signOut(auth);
            } else {
              updateUserState(userData);
              if (!userDoc.data().lastLoginAt || (Date.now() - toDate(userDoc.data().lastLoginAt).getTime()) > 5 * 60 * 1000) {
                updateDoc(userDocRef, { lastLoginAt: serverTimestamp(), lastActiveAt: serverTimestamp() });
              }
            }
          }
          setLoading(false);
        }, (error) => {
          console.error("Error listening to user document:", error);
          setLoading(false);
        });
        return () => unsubscribeDoc();
      } else {
        setHasAuthUser(false);
        updateUserState(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      errorEmitter.off('permission-error', handlePermissionError);
    };
  }, [auth, db, toast, updateUserState]);

  useEffect(() => {
    if (loading || isLoggingOut.current) return;

    if (isPublicPath(pathname)) {
      if (user && (pathname === '/login' || pathname === '/')) {
        smartPush('/dashboard');
      }
      return;
    }

    if (!user && !hasAuthUser) {
      const timer = setTimeout(() => {
        if (!user && !hasAuthUser && !loading) {
          smartPush('/login');
        }
      }, 5000);
      return () => clearTimeout(timer);
    }

    if (!user) return;

    // Role protection
    const installerPaths = ['/dashboard/my-bids', '/dashboard/verify-installer', '/dashboard/jobs'];
    const jobGiverPaths = ['/dashboard/post-job', '/dashboard/posted-jobs', '/dashboard/my-installers', '/dashboard/installers'];
    const adminPaths = ['/dashboard/reports', '/dashboard/users', '/dashboard/team', '/dashboard/all-jobs', '/dashboard/transactions', '/dashboard/settings', '/dashboard/subscription-plans', '/dashboard/coupons', '/dashboard/blacklist'];
    const supportPaths = ['/dashboard/disputes'];

    const isBrowseJobsPage = pathname === '/dashboard/jobs';
    const isOtherInstallerPage = ['/dashboard/my-bids', '/dashboard/verify-installer'].some(p => pathname.startsWith(p));
    const isInstallerOnlyPage = isBrowseJobsPage || isOtherInstallerPage;

    const isJobGiverPage = jobGiverPaths.some(p => pathname.startsWith(p));
    const isAdminPage = adminPaths.some(p => pathname.startsWith(p));
    const isSupportPage = supportPaths.some(p => pathname.startsWith(p));

    if (role === 'Job Giver' && isInstallerOnlyPage) {
      smartPush('/dashboard');
    } else if (role === 'Installer' && isJobGiverPage) {
      smartPush('/dashboard');
    } else if (role === 'Support Team' && !isSupportPage && pathname !== '/dashboard' && !pathname.startsWith('/dashboard/profile')) {
      smartPush('/dashboard/disputes');
    } else if (!user.roles.includes("Admin") && isAdminPage) {
      smartPush('/dashboard');
    }
  }, [role, pathname, user, loading, hasAuthUser, smartPush]);

  const setRole = useCallback((newRole: Role) => {
    setRoleState(newRole);
    manualRoleSet.current = true;
    localStorage.setItem('userRole', newRole);
    smartPush('/dashboard');
  }, [smartPush]);

  const logout = useCallback(async () => {
    isLoggingOut.current = true;
    try {
      await signOut(auth);
      updateUserState(null);
      localStorage.removeItem('userRole');
      smartPush('/login');
    } finally {
      isLoggingOut.current = false;
    }
  }, [auth, smartPush, updateUserState]);

  const login = useCallback(async (email: string, password?: string) => {
    if (!password) return false;
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return true;
    } catch (error) {
      console.error("Login failed:", error);
      return false;
    }
  }, [auth]);

  const value = useMemo(() => ({
    user, role, isAdmin, loading,
    setUser, setRole, logout, login
  }), [user, role, isAdmin, loading, setRole, logout, login]);

  // Don't show loader on public pages to avoid flash
  if (loading && !isPublicPath(pathname)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) throw new Error("useUser must be used within a UserProvider");
  return context;
};
