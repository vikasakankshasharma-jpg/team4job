"use client";

import { User } from '@/lib/types';
import { usePathname, useRouter } from "next/navigation";
import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from "react";
import { onAuthStateChanged, signOut, signInWithEmailAndPassword, User as FirebaseUser } from "firebase/auth";
import { doc, onSnapshot, updateDoc, serverTimestamp, collection, query, where, getDocs, getDoc, Timestamp } from "firebase/firestore";
import { Loader2 } from "lucide-react";
import { useToast } from "./use-toast";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { useFirestore, useFirebase } from "@/infrastructure/firebase/client-provider";
import { toDate } from "@/lib/utils";
import { updateSessionTokenAction, removeSessionTokenAction, getUserProfileAction } from "@/app/actions/auth.actions";


type Role = "Client" | "Professional" | "Admin" | "Support Team";

const normalizeRole = (role: string): Role | null => {
  const normalized = role.trim().toLowerCase();

  if (normalized === "client") return "Client";
  if (normalized === "professional") return "Professional";
  if (normalized === "admin") return "Admin";
  if (normalized === "support team") return "Support Team";

  return null;
};

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
const PUBLIC_PAGES = ['/login', '/', '/privacy', '/terms', '/privacy-policy', '/terms-of-service', '/refund-policy'];

// Helper to check if a path is public
const inferE2ERolesFromIdentity = (firebaseUser: FirebaseUser): Role[] => {
  const email = (firebaseUser.email || '').toLowerCase();

  if (email.includes('professional') || email.includes('pro') || email.includes('installer')) return ['Professional'];
  if (email.includes('giver') || email.includes('client')) return ['Client'];
  if (email.includes('admin') || email.includes('staff') || email.includes('vikasakankshasharma')) return ['Admin'];
  if (email.includes('dualrole')) return ['Professional', 'Client'];

  return ['Client'];
};

const isPublicPath = (path: string) => {
  if (!path) return false;
  // Accessing exactly /login/something is covered by startsWith
  if (path.startsWith('/login')) return true;

  // Normalize: remove trailing slash for exact matches
  const normalized = path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path;

  const isPublic = PUBLIC_PAGES.includes(normalized);
  return isPublic;
};

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { auth, db } = useFirebase();

  const [user, setUser] = useState<User | null>(null);
  const [role, setRoleState] = useState<Role>("Client");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasAuthUser, setHasAuthUser] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const manualRoleSet = useRef(false);
  const isLoggingOut = useRef(false);
  const lastRedirectPath = useRef<string | null>(null);
  const lastUpdateRef = useRef<number>(0);

  // Sync role from localStorage after hydration
  useEffect(() => {
    setIsMounted(true);
    const storedRole = localStorage.getItem('userRole') as Role;
    if (storedRole) {
      setRoleState(storedRole);
    }
  }, []);

  const smartPush = useCallback((path: string) => {
    if (pathname === path || lastRedirectPath.current === path) return;
    lastRedirectPath.current = path;
    router.push(path);
  }, [pathname, router]);

  const updateUserState = useCallback((userData: User | null) => {
    const normalizedUser =
      userData
        ? {
            ...userData,
            roles: Array.from(
              new Set(
                (userData.roles || [])
                  .map((role) => normalizeRole(role))
                  .filter((role): role is Role => role !== null)
              )
            ),
          }
        : null;

    setUser(normalizedUser);
    if (normalizedUser) {
      const storedRole = localStorage.getItem('userRole') as Role;
      const isAdminUser = normalizedUser.roles.includes("Admin");
      setIsAdmin(isAdminUser);

      if (manualRoleSet.current && storedRole && normalizedUser.roles.includes(storedRole)) {
        setRoleState(storedRole);
        return;
      }

      manualRoleSet.current = false;
      const canUseStoredRole = storedRole && normalizedUser.roles.includes(storedRole);

      if (canUseStoredRole) {
        setRoleState(storedRole);
      } else if (isAdminUser) {
        setRoleState("Admin");
        localStorage.setItem('userRole', "Admin");
      } else if (normalizedUser.roles.includes("Support Team")) {
        setRoleState("Support Team");
        localStorage.setItem('userRole', "Support Team");
      } else {
        const initialRole = normalizedUser.roles.includes("Professional") ? "Professional" : "Client";
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
      toast({
        title: "Permission Denied",
        description: "You do not have permission to perform this action.",
        variant: "destructive"
      });
    };

    errorEmitter.on('permission-error', handlePermissionError);

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      console.log('[useUser] onAuthStateChanged:', firebaseUser?.email || 'null', 'UID:', firebaseUser?.uid);
      if (isLoggingOut.current) return;

      if (firebaseUser) {
        // Sync token to cookie for server-side fetching
        try {
          const token = await firebaseUser.getIdToken();
          await updateSessionTokenAction(token);
        } catch (e) {
          // Silent fail on cookie sync, not fatal
        }

        // In E2E mode, avoid realtime listeners but still fetch the user profile once
        // so role-based UI can render correctly.
        // Force-stable for audit
        const isE2EMode = process.env.NEXT_PUBLIC_E2E === 'true' || process.env.NEXT_PUBLIC_E2E_MODE === 'true'; 
        if (isE2EMode) {
          console.log('[useUser] E2E Mode: Fetching profile once...');
          setLoading(true);
          setHasAuthUser(true);

          const fetchProfile = async () => {
            try {
              const userData = await getUserProfileAction(firebaseUser.uid);
              console.log('[useUser] Profile fetched:', userData?.email || 'null');
              if (userData) {
                updateUserState(userData);
              } else {
                updateUserState({
                  id: firebaseUser.uid,
                  email: firebaseUser.email!,
                  name: firebaseUser.displayName || firebaseUser.email!,
                  roles: inferE2ERolesFromIdentity(firebaseUser),
                  status: 'active',
                  memberSince: Timestamp.now(),
                  isMobileVerified: true,
                  isEmailVerified: true,
                } as User);
              }
            } catch (e) {
              console.error("Audit Server-Action Profile Fetch Error:", e);
              const fallbackUser: User = {
                id: firebaseUser.uid,
                email: firebaseUser.email!,
                name: firebaseUser.displayName || firebaseUser.email!,
                mobile: firebaseUser.phoneNumber || '',
                avatarUrl: firebaseUser.photoURL || '',
                roles: inferE2ERolesFromIdentity(firebaseUser),
                status: 'active',
                memberSince: Timestamp.now(),
                address: { fullAddress: '', cityPincode: '' },
                pincodes: { residential: '', office: '' },
                isMobileVerified: true,
                isEmailVerified: true,
              };
              updateUserState(fallbackUser);
            } finally {
              setLoading(false);
            }
          };
          fetchProfile();
          return;
        } else {
          // Standard realtime listener
          console.log('[useUser] Standard Mode: Subscribing to profile...');
          setLoading(true);
          setHasAuthUser(true);
          const unsubscribeProfile = onSnapshot(doc(db, "users", firebaseUser.uid), (doc) => {
            if (doc.exists()) {
              updateUserState(doc.data() as User);
            }
            setLoading(false);
          }, (error) => {
            console.error("Profile listener error:", error);
            setLoading(false);
          });
          return unsubscribeProfile;
        }
      } else {
        // Clear token cookie
        await removeSessionTokenAction();
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

    const res = ((): string | null => {
      // 1. Handling Public Paths
      if (isPublicPath(pathname)) {
        if (user && (pathname === '/login' || pathname === '/')) {
          console.log('[useUser] Redirecting to dashboard (Logged in on public page)');
          return '/dashboard';
        }
        return null;
      }
      
      const isProtectedPath = pathname.startsWith('/dashboard') || 
                              pathname.startsWith('/wizard') || 
                              pathname.startsWith('/profile');

      if (isProtectedPath && !user && !hasAuthUser) {
        console.log('[useUser] Redirecting to login (Protected path, no session)');
        return '/login';
      }

      if (hasAuthUser && !user) {
        return null;
      }

      const professionalPaths = ['/dashboard/my-bids', '/dashboard/verify-professional', '/dashboard/jobs'];
      const clientPaths = ['/dashboard/post-job', '/dashboard/posted-jobs', '/dashboard/my-professionals', '/dashboard/professionals'];
      const adminPaths = ['/dashboard/reports', '/dashboard/users', '/dashboard/team', '/dashboard/all-jobs', '/dashboard/transactions', '/dashboard/subscription-plans', '/dashboard/coupons', '/dashboard/blacklist'];
      const supportPaths = ['/dashboard/disputes'];

      const isBrowseJobsPage = pathname === '/dashboard/jobs';
      const isOtherProfessionalPage = ['/dashboard/my-bids', '/dashboard/verify-professional'].some(p => pathname.startsWith(p));
      const isProfessionalOnlyPage = isBrowseJobsPage || isOtherProfessionalPage;

      const isClientPage = clientPaths.some(p => pathname.startsWith(p));
      const isAdminPage = adminPaths.some(p => pathname.startsWith(p));
      const isSupportPage = supportPaths.some(p => pathname.startsWith(p));

      if (role === 'Client' && isProfessionalOnlyPage) {
        return '/dashboard';
      } else if (role === 'Professional' && isClientPage) {
        return '/dashboard';
      } else if (role === 'Support Team' && !isSupportPage && pathname !== '/dashboard' && !pathname.startsWith('/dashboard/profile')) {
        return '/dashboard/disputes';
      } else if (!user?.roles.includes("Admin") && isAdminPage) {
        return '/dashboard';
      }

      return null;
    })();

    if (res && res !== pathname) {
    }
    return res;
  };

  const redirectPath = getRedirectPath();

  useEffect(() => {
    if (redirectPath && !isLoggingOut.current) {
      smartPush(redirectPath);
    }
  }, [redirectPath, smartPush, pathname, role, user?.email]);



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
    let email = identifier;
    try {
      // Check if identifier is a mobile number (10 digits)
      const isMobile = /^\d{10}$/.test(identifier);

      if (isMobile) {
        // Query Firestore to find user with this mobile number
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("mobile", "==", identifier));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
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
          return false;
        }
        email = userData.email;
      }

      await signInWithEmailAndPassword(auth, email, password);
      return true;
    } catch (error: any) {
      return false;
    }
  }, [auth, db, toast]);

  // Value provided to context
  const value = useMemo(() => ({
    user, role, isAdmin, loading,
    setUser, setRole, logout, login
  }), [user, role, isAdmin, loading, setUser, setRole, logout, login]);


  // RENDER LOGIC:
  // 1. If loading, show loader
  // 2. If we determined a redirect is necessary, show loader
  // 1. If loading, show loader
  // 2. If we determined a redirect is necessary, show loader
  const isPublic = isPublicPath(pathname);
  const shouldShowLoader = (loading && !isPublic) || (redirectPath !== null);

  if (shouldShowLoader) {
    return (
      <div className="flex items-center justify-center min-h-screen" data-testid="initial-loader">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If we are on a protected path but don't have a user, show loader or error
  if (!isPublic && !user) {
    if (hasAuthUser) {
      // We have an auth session but profile failed to load
      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
          <h2 className="text-xl font-semibold mb-2 text-destructive">Profile Fetch Error</h2>
          <p className="text-muted-foreground mb-4 max-w-sm">We could not load your user profile. This might be due to a network error or missing data.</p>
          <button
            onClick={() => logout()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Sign Out & Try Again
          </button>
        </div>
      );
    } else {
      // No auth session and on a protected path - should be redirecting, but show loader meanwhile
      return (
        <div className="flex items-center justify-center min-h-screen" data-testid="initial-loader">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }
  }

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) throw new Error("useUser must be used within a UserProvider");
  return context;
};
