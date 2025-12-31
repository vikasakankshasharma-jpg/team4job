
"use client";

import { User, BlacklistEntry } from "@/lib/types";
import { usePathname, useRouter } from "next/navigation";
import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from "react";
import { onAuthStateChanged, signOut, signInWithEmailAndPassword, User as FirebaseUser } from "firebase/auth";
import { getDoc, getDocFromServer, collection, getDocs, onSnapshot, query, where, doc, updateDoc, serverTimestamp } from "firebase/firestore";
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

  // Refs to prevent race conditions
  const manualRoleSet = useRef(false);
  const isLoggingOut = useRef(false);
  const lastRedirect = useRef<{ path: string; timestamp: number } | null>(null);

  const updateUserState = useCallback((userData: User | null) => {
    setUser(userData);
    if (userData) {
      const storedRole = localStorage.getItem('userRole') as Role;
      const isAdminUser = userData.roles.includes("Admin");
      setIsAdmin(isAdminUser);

      // If role was manually set and user hasn't changed, preserve it
      if (manualRoleSet.current && storedRole && userData.roles.includes(storedRole)) {
        setRoleState(storedRole);
        return;
      }

      // Reset manual flag if this is a different user
      manualRoleSet.current = false;

      // Check if we can use the stored role (if it exists and user still has it)
      const canUseStoredRole = storedRole && userData.roles.includes(storedRole);

      if (canUseStoredRole) {
        setRoleState(storedRole);
        // If stored role is Admin, ensure localStorage matches (it should already)
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
    setLoading(true);

    const handlePermissionError = (error: FirestorePermissionError) => {
      console.error("Intercepted Firestore Permission Error:", error);
      toast({
        title: "Permission Denied",
        description: `You do not have permission to perform this action. The operation for path '${error.context.path}' was denied.`,
        variant: "destructive"
      });
    };

    errorEmitter.on('permission-error', handlePermissionError);

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      // Prevent re-initialization during logout
      if (isLoggingOut.current) {
        return;
      }

      if (firebaseUser) {
        const userDocRef = doc(db, "users", firebaseUser.uid);

        const unsubscribeDoc = onSnapshot(userDocRef, async (userDoc) => {
          if (userDoc.exists()) {
            const userData = { id: userDoc.id, ...userDoc.data() } as User;

            if (userData.status === 'deactivated' || (userData.status === 'suspended' && userData.suspensionEndDate && toDate(userData.suspensionEndDate) > new Date())) {
              toast({ title: 'Access Denied', description: `Your account is currently restricted.`, variant: 'destructive' });
              signOut(auth);
            } else {
              updateUserState(userData);

              const now = new Date();
              const lastActive = toDate(userData.lastActiveAt || userData.lastLoginAt || userData.memberSince);
              const daysInactive = (now.getTime() - lastActive.getTime()) / (1000 * 3600 * 24);

              // Auto-Inactivate if > 90 days
              if (daysInactive > 90 && userData.status === 'active' && userData.roles.includes('Installer')) {
                updateDoc(userDocRef, {
                  status: 'deactivated',
                  'installerProfile.adminNotes': `Auto-deactivated for inactivity (>90 days) on ${now.toISOString()}`
                });
                toast({
                  title: "Account Deactivated",
                  description: "Your account has been deactivated due to inactivity (>3 months). Please contact support/admin to reactivate.",
                  variant: "destructive"
                });
              } else {
                if (userDoc.data().lastLoginAt === undefined || (Date.now() - toDate(userDoc.data().lastLoginAt).getTime()) > 5 * 60 * 1000) {
                  updateDoc(userDocRef, {
                    lastLoginAt: serverTimestamp(),
                    lastActiveAt: serverTimestamp()
                  });
                }
              }
            }
          } else {
            console.error("User document not found for authenticated user in snapshot listener:", firebaseUser.uid);
          }
          setLoading(false);
        }, (error) => {
          console.error("Error listening to user document:", error);
          if (error.code === 'permission-denied') {
            // Handle permission error gracefully?
            console.error("Permission denied for user doc.");
          }
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
      errorEmitter.off('permission-error', handlePermissionError);
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
    const installerPaths = ['/dashboard/my-bids', '/dashboard/verify-installer'];
    const jobGiverPaths = ['/dashboard/post-job', '/dashboard/posted-jobs', '/dashboard/my-installers', '/dashboard/installers'];
    const adminOnlyPaths = ['/dashboard/reports', '/dashboard/users', '/dashboard/team', '/dashboard/all-jobs', '/dashboard/transactions', '/dashboard/settings', '/dashboard/subscription-plans', '/dashboard/coupons', '/dashboard/blacklist'];
    const supportOnlyPaths = ['/dashboard/disputes'];

    const isInstallerPage = installerPaths.some(p => pathname.startsWith(p)) || pathname === '/dashboard/jobs'; // Browse jobs page only
    const isJobGiverPage = jobGiverPaths.some(p => pathname.startsWith(p));
    const isAdminPage = adminOnlyPaths.some(p => pathname.startsWith(p));
    const isSupportPage = supportOnlyPaths.some(p => pathname.startsWith(p));

    const userIsAdmin = user.roles.includes("Admin");

    // Helper function to debounce redirects
    const shouldRedirect = (targetPath: string): boolean => {
      const now = Date.now();
      if (lastRedirect.current &&
        lastRedirect.current.path === targetPath &&
        now - lastRedirect.current.timestamp < 500) {
        return false; // Prevent rapid successive redirects
      }
      lastRedirect.current = { path: targetPath, timestamp: now };
      return true;
    };

    if (role === 'Job Giver' && isInstallerPage) {
      if (shouldRedirect('/dashboard')) router.push('/dashboard');
    } else if (role === 'Installer' && isJobGiverPage) {
      if (shouldRedirect('/dashboard')) router.push('/dashboard');
    } else if (role === 'Support Team' && !(isSupportPage || pathname === '/dashboard' || pathname.startsWith('/dashboard/profile'))) {
      if (shouldRedirect('/dashboard/disputes')) router.push('/dashboard/disputes');
    } else if (userIsAdmin && (isInstallerPage || isJobGiverPage)) {
      // Admins can access most pages, but we could redirect them if needed
    } else if (!userIsAdmin && isAdminPage) {
      if (shouldRedirect('/dashboard')) router.push('/dashboard');
    }

  }, [role, pathname, user, router, loading]);


  const handleSetRole = useCallback((newRole: Role) => {
    if (user && user.roles.includes(newRole)) {
      setRoleState(newRole);
      localStorage.setItem('userRole', newRole);
      manualRoleSet.current = true; // Mark as manually set
    }
  }, [user]);

  const handleLogout = useCallback(() => {
    isLoggingOut.current = true;
    manualRoleSet.current = false;
    localStorage.removeItem('userRole');

    signOut(auth).then(() => {
      updateUserState(null);
      isLoggingOut.current = false;
      router.replace('/login'); // Use replace to prevent back navigation
    }).catch((error) => {
      console.error("Logout error:", error);
      isLoggingOut.current = false;
    });
  }, [auth, updateUserState, router]);

  const handleLogin = useCallback(async (email: string, password?: string): Promise<boolean> => {
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
  }, [auth]);


  const value = useMemo(() => ({
    user,
    role,
    isAdmin,
    loading,
    setUser,
    setRole: handleSetRole,
    logout: handleLogout,
    login: handleLogin,
  }), [user, role, isAdmin, loading, handleSetRole, handleLogout, handleLogin]);

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

