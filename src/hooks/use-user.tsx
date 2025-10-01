
"use client";

import { User } from "@/lib/types";
import { usePathname, useRouter } from "next/navigation";
import React, { createContext, useContext, useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, onSnapshot, doc } from "firebase/firestore";

type Role = "Job Giver" | "Installer" | "Admin";

type UserContextType = {
  user: User | null;
  role: Role;
  setUser: React.Dispatch<React.SetStateAction<User | null>> | null;
  setRole: (role: Role) => void;
  login: (email: string) => Promise<boolean>;
  logout: () => void;
};

const UserContext = createContext<UserContextType | null>(null);

const installerPaths = ['/dashboard/my-bids'];
const jobGiverPaths = ['/dashboard/posted-jobs', '/dashboard/post-job'];


export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRoleState] = useState<Role>("Installer");
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const storedUserId = localStorage.getItem('loggedInUserId');
    if (storedUserId) {
        const userDocRef = doc(db, 'users', storedUserId);
        const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const loggedInUser = { id: docSnap.id, ...docSnap.data() } as User;
                setUser(loggedInUser);
                const storedRole = localStorage.getItem('userRole') as Role;
                if (storedRole && loggedInUser.roles.includes(storedRole)) {
                    setRoleState(storedRole);
                } else {
                    const initialRole = loggedInUser.roles.includes("Admin") ? "Admin" : loggedInUser.roles.includes("Installer") ? "Installer" : "Job Giver";
                    setRoleState(initialRole);
                }
            } else {
                logout(); // User not found in DB, clear local state
            }
        });
        return () => unsubscribe();
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    // Redirect if the user is on a page not allowed for the current role
    const isInstallerPage = installerPaths.some(p => pathname.startsWith(p));
    const isJobGiverPage = jobGiverPaths.some(p => pathname.startsWith(p));

    if (role === 'Job Giver' && isInstallerPage) {
        router.push('/dashboard');
    }
    if (role === 'Installer' && isJobGiverPage) {
        router.push('/dashboard');
    }
  }, [role, pathname, user, router]);


  const login = async (email: string) => {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", email.toLowerCase()));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        const foundUser = { id: userDoc.id, ...userDoc.data() } as User;
        
        setUser(foundUser);
        localStorage.setItem('loggedInUserId', foundUser.id);
        const initialRole = foundUser.roles.includes("Admin") ? "Admin" : foundUser.roles.includes("Installer") ? "Installer" : "Job Giver";
        setRoleState(initialRole);
        localStorage.setItem('userRole', initialRole);
        return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('loggedInUserId');
    localStorage.removeItem('userRole');
  };

  const setRole = (newRole: Role) => {
    if (user && user.roles.includes(newRole)) {
      setRoleState(newRole);
      localStorage.setItem('userRole', newRole);
    }
  };

  return (
    <UserContext.Provider value={{ user, role, setRole, login, logout, setUser }}>
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

    