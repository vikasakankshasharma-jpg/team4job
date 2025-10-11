

"use client";

import { User, UserStatus } from "@/lib/types";
import { usePathname, useRouter } from "next/navigation";
import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import { onAuthStateChanged, signOut, signInWithEmailAndPassword, User as FirebaseUser } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
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

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRoleState] = useState<Role>("Installer");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const firebaseContext = useFirebase();
  const { toast } = useToast();

  useEffect(() => {
    if (!firebaseContext) return;
    
    const { auth, db } = firebaseContext;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        try {
            const userDocRef = doc(db, "users", firebaseUser.uid);
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
              const userData = { id: userDoc.id, ...userDoc.data() } as User;
              
              if (userData.status === 'deactivated' || (userData.status === 'suspended' && userData.suspensionEndDate && new Date() < (userData.suspensionEndDate as any).toDate())) {
                  let message = 'Your account has been deactivated.';
                  if (userData.status === 'suspended') {
                      message = `Your account is suspended until ${new Date(userData.suspensionEndDate as any).toLocaleString()}.`;
                  }
                  toast({ title: 'Access Denied', description: message, variant: 'destructive' });
                  await signOut(auth);
                  setUser(null);
                  setIsAdmin(false);
                  setLoading(false);
                  return;
              }

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
              console.error("User document not found for authenticated user:", firebaseUser.uid);
              await signOut(auth); 
              setUser(null);
              setIsAdmin(false);
            }
        } catch (error) {
            console.error("Error fetching user document:", error);
            setUser(null);
            setIsAdmin(false);
        }
      } else {
        setUser(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [firebaseContext, toast]); 


  useEffect(() => {
    if (loading) return;
    
    const isInstallerPage = installerPaths.some(p => pathname.startsWith(p));
    const isJobGiverPage = jobGiverPaths.some(p => pathname.startsWith(p));

    if (role === 'Job Giver' && isInstallerPage) {
        router.push('/dashboard');
    }
    if (role === 'Installer' && isJobGiverPage) {
        router.push('/dashboard');
    }
  }, [role, pathname, user, router, loading]);


  const login = async (email: string, password?: string) => {
    if (!firebaseContext) return false;
    setLoading(true);
    if (!password) {
        setLoading(false);
        return false;
    }
    try {
      await signInWithEmailAndPassword(firebaseContext.auth, email, password);
      // onAuthStateChanged will handle setting user state, which will trigger setLoading(false)
      return true;
    } catch (error) {
      console.error("Login failed:", error);
      setLoading(false);
      return false;
    }
  };

  const logout = async () => {
    if (!firebaseContext) return;
    await signOut(firebaseContext.auth);
    setUser(null);
    setIsAdmin(false);
    localStorage.removeItem('userRole');
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
  }), [user, role, isAdmin, loading, firebaseContext]);

  return (
    <UserContext.Provider value={value}>
      {loading ? 
        <div className="flex h-screen items-center justify-center">
            <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Loading...</span>
            </div>
        </div>
      : children}
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
