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
import { getUserProfileAction } from "@/app/actions/auth.actions";


type Role = "Client" | "Professional" | "Admin" | "Support Team";

const normalizeRole = (role: string): Role | null => {
  const normalized = role.trim().toLowerCase();

  if (normalized === "client" || normalized === "job giver") return "Client";
  if (normalized === "professional" || normalized === "installer") return "Professional";
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
  const isInitialAuthCheckDone = useRef(false);

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
      const isE2EMode = process.env.NEXT_PUBLIC_E2E === 'true' || process.env.NEXT_PUBLIC_E2E_MODE === 'true';
      isInitialAuthCheckDone.current = true;
      if (isLoggingOut.current) {
        return;
      }

      if (firebaseUser) {
        // Sync token to cookie for server-side fetching
        try {
          const token = await firebaseUser.getIdToken();
          // Use API route instead of Server Action to bypass CSRF 400 issues in CI
          // 🚀 SAFETY: Add 5s timeout to prevent hanging the auth listener
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);
          
          await fetch('/api/auth/session', {
            method: 'POST',
            body: JSON.stringify({ token }),
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal
          }).finally(() => clearTimeout(timeoutId));
        } catch (e: any) {
          // Token revoked, expired, or user disabled — sign out and let onAuthStateChanged handle redirect
          const isAuthError = e?.code?.startsWith('auth/') ||
            e?.message?.includes('revoked') ||
            e?.message?.includes('token') ||
            e?.message?.includes('INVALID_ID_TOKEN');
          if (isAuthError) {
            console.warn('[useUser] Auth token error. Signing out...', e?.code);
            await signOut(auth).catch(() => {});
            return;
          }
          // Non-auth errors (e.g. network): silent fail on cookie sync, not fatal
        }

        // In E2E mode, avoid realtime listeners but still fetch the user profile once
        // so role-based UI can render correctly.
        if (isE2EMode) {
          setLoading(true);
          setHasAuthUser(true);

          const fetchProfile = async () => {
            try {
              const userData = await getUserProfileAction(firebaseUser.uid);
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
                address: { house: '', street: '', fullAddress: '', cityPincode: '' },
                addresses: { residence: { house: '', street: '', fullAddress: '', cityPincode: '' } },
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
          setLoading(true);
          setHasAuthUser(true);
          let unsubscribeProfile = () => {};
          let resolved = false;
          
          // Safety valve: if loading hasn't resolved after 8s (e.g. Firestore SDK internal error),
          // unblock the UI so the user isn't stuck on an infinite spinner.
          const loadingTimeout = setTimeout(() => {
            setLoading(prev => {
              if (prev) {
                console.warn('[useUser] Loading timeout reached — forcing loading=false to unblock UI.');
              }
              return false;
            });
          }, 8000);

          // Emulator fallback: if onSnapshot doesn't resolve within 4s (common with nullValue SDK bug),
          // fall back to a one-time getDoc which is immune to the WebChannel crash.
          const snapshotFallbackTimer = setTimeout(async () => {
            if (resolved) return;
            console.warn('[useUser] onSnapshot timeout — falling back to getDoc for emulator compatibility.');
            try {
              const { getDoc, doc: firestoreDoc } = await import('firebase/firestore');
              const docSnap = await getDoc(firestoreDoc(db, "users", firebaseUser.uid));
              if (resolved) return; // onSnapshot resolved while we were fetching
              clearTimeout(loadingTimeout);
              resolved = true;
              if (docSnap.exists()) {
                updateUserState(docSnap.data() as User);
              }
              setLoading(false);
            } catch (e) {
              if (resolved) return;
              clearTimeout(loadingTimeout);
              resolved = true;
              setLoading(false);
            }
          }, 4000);

          try {
            unsubscribeProfile = onSnapshot(doc(db, "users", firebaseUser.uid), async (snapshot) => {
              if (resolved) return;
              resolved = true;
              clearTimeout(loadingTimeout);
              clearTimeout(snapshotFallbackTimer);
              if (snapshot.exists()) {
                updateUserState(snapshot.data() as User);
                setLoading(false);
              } else {
                // Self-healing migration for seeded users
                const { query, collection, where, getDocs, setDoc, doc: firestoreDoc } = await import('firebase/firestore');
                const q = query(collection(db, "users"), where("email", "==", firebaseUser.email));
                const querySnapshot = await getDocs(q);
                
                if (!querySnapshot.empty && querySnapshot.docs[0].id !== firebaseUser.uid) {
                  const legacyDoc = querySnapshot.docs[0];
                  const legacyData = legacyDoc.data();
                  
                  const newData = {
                    ...legacyData,
                    id: firebaseUser.uid,
                    updatedAt: new Date().toISOString()
                  } as any as User;
                  
                  await setDoc(firestoreDoc(db, "users", firebaseUser.uid), newData);
                  updateUserState(newData);
                } else {
                }
                setLoading(false);
              }
            }, (error) => {
              clearTimeout(loadingTimeout);
              clearTimeout(snapshotFallbackTimer);
              // Handle permission-denied vs other errors
              if (error.code === 'permission-denied') {
                errorEmitter.emit('permission-error', new FirestorePermissionError({
                  path: `users/${firebaseUser.uid}`,
                  operation: 'get'
                }));
              }
              if (!resolved) {
                resolved = true;
                setLoading(false);
              }
            });
          } catch (e) {
            clearTimeout(loadingTimeout);
            clearTimeout(snapshotFallbackTimer);
            resolved = true;
            setLoading(false);
          }
          return () => {
            clearTimeout(loadingTimeout);
            clearTimeout(snapshotFallbackTimer);
            unsubscribeProfile();
          };
        }
      } else {
        // Clear token cookie
        // Clear token cookie via API route
        await fetch('/api/auth/session', { method: 'DELETE' }).catch(() => {});
        setHasAuthUser(false);
        updateUserState(null);
        setLoading(false);
      if (typeof window !== 'undefined') {
        document.body.dataset.hydrated = 'true';
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
    if (loading || !isInitialAuthCheckDone.current) {
        if (pathname.startsWith('/dashboard')) {
        }
        return null;
    }


    const res = ((): string | null => {
      // 1. Handling Public Paths
      if (isPublicPath(pathname)) {
        if (user && (pathname === '/login' || pathname === '/')) {
          return '/dashboard';
        }
        return null;
      }
      
      const isProtectedPath = pathname.startsWith('/dashboard') || 
                              pathname.startsWith('/wizard') || 
                              pathname.startsWith('/profile');

      if (isProtectedPath && !user && !hasAuthUser) {
        if (loading) {
           return null;
        }
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
      // Hard fallback: if redirecting to /login and still on same page after 3s,
      // force a full page navigate to break any potential router loop.
      if (redirectPath === '/login') {
        const timer = setTimeout(() => {
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
        }, 3000);
        return () => clearTimeout(timer);
      }
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
      // Deterministically clear session cookie
      await fetch('/api/auth/session', { method: 'DELETE' }).catch(() => {});
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

      // 🚀 DETERMINISM FIX: Sync session but don't let it block the entire login flow 
      // if it hangs (5s timeout).
      const firebaseUser = auth.currentUser;
      if (firebaseUser) {
        try {
          const token = await firebaseUser.getIdToken();
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);
          
          await fetch('/api/auth/session', {
            method: 'POST',
            body: JSON.stringify({ token }),
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal
          }).finally(() => clearTimeout(timeoutId));
        } catch (err) {
          console.error('[useUser] Session sync failed or timed out:', err);
        }
      }

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
  const isPublic = isPublicPath(pathname);
  
  // High-level "blocking" loader only for initial auth check or if user is missing on protected path
  // If we have a redirectPath, it means we definitely need to go somewhere else.
  // We only block the whole screen if we are still doing the initial check.
  const shouldBlockScreen = (loading && !isInitialAuthCheckDone.current && !isPublic) || (redirectPath !== null && !isMounted);

  if (shouldBlockScreen) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background" data-testid="initial-loader">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        {redirectPath && (
          <div className="text-sm text-muted-foreground animate-pulse">
            Redirecting to {redirectPath}...
          </div>
        )}
      </div>
    );
  }

  // If we are on a protected path but don't have a user, and initial check is done
  if (!isPublic && !user && isInitialAuthCheckDone.current) {
    // If we have a redirect path, we'll let the useEffect handle it, 
    // but we show a loader here to prevent flashing protected content.
    if (redirectPath) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <div className="text-sm text-muted-foreground">Redirecting to login...</div>
        </div>
      );
    }
    
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
