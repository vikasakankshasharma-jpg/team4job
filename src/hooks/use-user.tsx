"use client";

import { User } from "@/lib/types";
import { usePathname, useRouter } from "next/navigation";
import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from "react";
import { onAuthStateChanged, signOut, signInWithEmailAndPassword, User as FirebaseUser } from "firebase/auth";
import { doc, onSnapshot, updateDoc, serverTimestamp, collection, query, where, getDocs } from "firebase/firestore";
import { Loader2 } from "lucide-react";
import { useToast } from "./use-toast";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { useAuth, useFirestore } from "@/lib/firebase/client-provider";
import { toDate } from "@/lib/utils";
import { setAuthTokenAction, clearAuthTokenAction } from "@/app/actions/auth.actions";

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
  login: (identifier: string, password?: string) => Promise<boolean>;
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
  const lastUpdateRef = useRef<number>(0);

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
        // Sync token to cookie for server-side fetching
        try {
          const token = await firebaseUser.getIdToken();
          await setAuthTokenAction(token);
        } catch (e) {
          console.error('[useUser] Failed to sync token to cookie:', e);
        }

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

              // Safety Throttle: Prevent infinite loops if DB clock is off or multiple snapshots fire
              const lastUpdate = lastUpdateRef.current;
              const now = Date.now();
              const timeSinceLocalUpdate = now - lastUpdate;

              const dbLastLogin = userDoc.data().lastLoginAt ? toDate(userDoc.data().lastLoginAt).getTime() : 0;
              const timeSinceDbUpdate = now - dbLastLogin;

              // Only update if it's been > 5 minutes LOCALLY and remotely
              if (timeSinceLocalUpdate > 5 * 60 * 1000 && timeSinceDbUpdate > 5 * 60 * 1000) {
                lastUpdateRef.current = now; // Mark local update immediately
                updateDoc(userDocRef, { lastLoginAt: serverTimestamp(), lastActiveAt: serverTimestamp() }).catch(e => {
                  console.error("Failed to update user activity:", e);
                });
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
        // Clear token cookie
        await clearAuthTokenAction();
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

  // Calculate if we need to redirect
  // We do this during render to prevent "flash of content"
  // If we determine a redirect is needed, we return a Loader instead of children
  // and let the useEffect perform the side-effect (the actual navigation)

  const getRedirectPath = (): string | null => {
    // If still loading auth state, we are not ready to decide
    if (loading) return null;

    // 1. Handling Public Paths
    if (isPublicPath(pathname)) {
      // If user is logged in and on login/home page, redirect to dashboard
      if (user && (pathname === '/login' || pathname === '/')) {
        return '/dashboard';
      }
      // Otherwise, public pages are accessible
      return null;
    }

    // 2. Handling Private Paths (Auth Check)
    // If not public and no user, needs login
    // IMPORTANT: Only redirect if we have NO Firebase auth user AND no firestore user
    // If hasAuthUser is true but user is null, we're still loading Firestore data
    if (!user && !hasAuthUser) {
      return '/login';
    }

    // If we have Firebase auth but waiting for Firestore, stay on loader (don't redirect)
    if (hasAuthUser && !user) {
      return null; // Keep showing loader while Firestore loads
    }

    // 3. Handling Role Protection & Role-Specific Pages
    if (!user) return null; // Should be covered above, but for type safety check

    // Role protection
    const installerPaths = ['/dashboard/my-bids', '/dashboard/verify-installer', '/dashboard/jobs'];
    const jobGiverPaths = ['/dashboard/post-job', '/dashboard/posted-jobs', '/dashboard/my-installers', '/dashboard/installers'];
    const adminPaths = ['/dashboard/reports', '/dashboard/users', '/dashboard/team', '/dashboard/all-jobs', '/dashboard/transactions', '/dashboard/subscription-plans', '/dashboard/coupons', '/dashboard/blacklist'];
    const supportPaths = ['/dashboard/disputes'];

    const isBrowseJobsPage = pathname === '/dashboard/jobs';
    const isOtherInstallerPage = ['/dashboard/my-bids', '/dashboard/verify-installer'].some(p => pathname.startsWith(p));
    const isInstallerOnlyPage = isBrowseJobsPage || isOtherInstallerPage;

    const isJobGiverPage = jobGiverPaths.some(p => pathname.startsWith(p));
    const isAdminPage = adminPaths.some(p => pathname.startsWith(p));
    const isSupportPage = supportPaths.some(p => pathname.startsWith(p));

    if (role === 'Job Giver' && isInstallerOnlyPage) {
      return '/dashboard';
    } else if (role === 'Installer' && isJobGiverPage) {
      return '/dashboard';
    } else if (role === 'Support Team' && !isSupportPage && pathname !== '/dashboard' && !pathname.startsWith('/dashboard/profile')) {
      return '/dashboard/disputes';
    } else if (!user.roles.includes("Admin") && isAdminPage) {
      return '/dashboard';
    }

    return null;
  };

  const redirectPath = getRedirectPath();

  useEffect(() => {
    if (redirectPath && !isLoggingOut.current) {
      smartPush(redirectPath);
    }
  }, [redirectPath, smartPush]);



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

  const login = useCallback(async (identifier: string, password?: string) => {
    if (!password) return false;
    try {
      let email = identifier;

      // Check if identifier is a mobile number (10 digits)
      const isMobile = /^\d{10}$/.test(identifier);

      if (isMobile) {
        // Query Firestore to find user with this mobile number
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("mobile", "==", identifier));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          console.error("Login failed: No user found with this mobile number");
          toast({
            title: "Login Failed",
            description: "No account found with this mobile number.",
            variant: "destructive",
          });
          return false;
        }

        // Get the first matching user's email
        // Assuming mobile numbers are unique
        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data();
        if (!userData.email) {
          console.error("Login failed: User has no email");
          return false;
        }
        email = userData.email;
      }

      await signInWithEmailAndPassword(auth, email, password);
      return true;
    } catch (error) {
      console.error("Login failed:", error);
      return false;
    }
  }, [auth, db, toast]);

  // Value provided to context
  const value = useMemo(() => ({
    user, role, isAdmin, loading,
    setUser, setRole, logout, login
  }), [user, role, isAdmin, loading, setUser, setRole, logout, login]);


  // RENDER LOGIC:
  // 1. If loading, show loader (unless it's public path, then show content maybe? - Original logic said "Don't show loader on public pages to avoid flash")
  //    Wait, if we are on public page and loading, we show content?
  //    Original: if (loading && !isPublicPath(pathname)) return <Loader>
  //    Refined:
  //    If we are redirecting (redirectPath !== null), we MUST show loader to avoid flashing wrong content.
  //    If we are initializing (loading === true) AND not on a public page, show loader.

  const shouldShowLoader = (loading && !isPublicPath(pathname)) || (redirectPath !== null);

  if (shouldShowLoader) {
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
