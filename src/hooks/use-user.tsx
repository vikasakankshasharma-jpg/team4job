
"use client";

import { User } from "@/lib/types";
import { usePathname, useRouter } from "next/navigation";
import React, { createContext, useContext, useState, useEffect } from "react";
import { users as mockUsers } from "@/lib/data";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { app, db } from "@/lib/firebase/client-config";


type Role = "Job Giver" | "Installer" | "Admin";

type UserContextType = {
  user: User | null;
  role: Role;
  isAdmin: boolean;
  setUser: React.Dispatch<React.SetStateAction<User | null>> | null;
  setRole: (role: Role) => void;
  login: (email: string, signupData?: any) => Promise<boolean>;
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
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
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
          // No user document, log them out
          await signOut(auth);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);


  useEffect(() => {
    if (!user || loading) return;
    
    const isInstallerPage = installerPaths.some(p => pathname.startsWith(p));
    const isJobGiverPage = jobGiverPaths.some(p => pathname.startsWith(p));

    if (role === 'Job Giver' && isInstallerPage) {
        router.push('/dashboard');
    }
    if (role === 'Installer' && isJobGiverPage) {
        router.push('/dashboard');
    }
  }, [role, pathname, user, router, loading]);


  const login = async (email: string) => {
    // This is a simplified login for the demo that finds a user by email from mock data
    // A real app would use signInWithEmailAndPassword.
    const mockUser = mockUsers.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (mockUser) {
        // This is a mock login, we are just setting the user state
        // onAuthStateChanged will not fire, so we manually do what it would
        const userDocRef = doc(db, "users", mockUser.id);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
            const userData = { id: userDoc.id, ...userDoc.data() } as User;
            setUser(userData);

            const isAdminUser = userData.roles.includes("Admin");
            const initialRole = isAdminUser ? "Admin" : userData.roles.includes("Installer") ? "Installer" : "Job Giver";
            setIsAdmin(isAdminUser);
            setRoleState(initialRole);
            localStorage.setItem('userRole', initialRole);
            return true;
        }
    }
    return false;
  };

  const logout = () => {
    // In a real app: await signOut(auth);
    setUser(null);
    setIsAdmin(false);
    localStorage.removeItem('userRole');
  };

  const setRole = (newRole: Role) => {
    if (user && user.roles.includes(newRole)) {
      setRoleState(newRole);
      localStorage.setItem('userRole', newRole);
    }
  };

  return (
    <UserContext.Provider value={{ user, role, isAdmin, setRole, login, logout, setUser }}>
      {loading ? 
        <div className="flex h-screen items-center justify-center">
            <p className="text-muted-foreground">Loading user session...</p>
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
