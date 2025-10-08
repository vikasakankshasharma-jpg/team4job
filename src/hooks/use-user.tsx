
"use client";

import { User } from "@/lib/types";
import { usePathname, useRouter } from "next/navigation";
import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import { getAuth, onAuthStateChanged, signOut, signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { app, db } from "@/lib/firebase/client-config";


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

const auth = getAuth(app);

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRoleState] = useState<Role>("Installer");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true); // Start as true
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
            const userDocRef = doc(db, "users", firebaseUser.uid);
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
              const userData = { id: userDoc.id, ...userDoc.data() } as User;
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
              // This case happens if a user exists in Auth but not in Firestore.
              // Log them out to prevent being stuck.
              await signOut(auth);
              setUser(null);
            }
        } catch (error) {
            console.error("Error fetching user document:", error);
            // Log out on error to prevent being stuck
            await signOut(auth);
            setUser(null);
        }
      } else {
        setUser(null);
        setIsAdmin(false);
      }
      setLoading(false); // Set loading to false after user status is determined
    });

    return () => unsubscribe();
  }, []);


  useEffect(() => {
    if (loading) return; // Don't run this effect while still loading
    
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
    setLoading(true);
    if (!password) {
        setLoading(false);
        return false;
    }
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged will handle setting user state and setLoading(false)
      return true;
    } catch (error) {
      console.error("Login failed:", error);
      setLoading(false);
      return false;
    }
  };

  const logout = async () => {
    await signOut(auth);
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
  }), [user, role, isAdmin, loading]);

  return (
    <UserContext.Provider value={value}>
      {loading ? 
        <div className="flex h-screen items-center justify-center">
            <p className="text-muted-foreground">Loading...</p>
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
