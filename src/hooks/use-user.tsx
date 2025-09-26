
"use client";

import { users, type User } from "@/lib/data";
import { usePathname, useRouter } from "next/navigation";
import React, { createContext, useContext, useState, useEffect } from "react";

type Role = "Job Giver" | "Installer";

type UserContextType = {
  user: User | null;
  role: Role;
  setUser: React.Dispatch<React.SetStateAction<User | null>> | null;
  setRole: (role: Role) => void;
  login: (userId: string) => void;
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
        const loggedInUser = users.find(u => u.id === storedUserId);
        if (loggedInUser) {
            setUser(loggedInUser);
            const storedRole = localStorage.getItem('userRole') as Role;
            if (storedRole && loggedInUser.roles.includes(storedRole)) {
                setRoleState(storedRole);
            } else {
                const initialRole = loggedInUser.roles.includes("Installer") ? "Installer" : "Job Giver";
                setRoleState(initialRole);
            }
        }
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


  const login = (userId: string) => {
    const foundUser = users.find((u) => u.id === userId);
    if (foundUser) {
      setUser(foundUser);
      localStorage.setItem('loggedInUserId', userId);
      const initialRole = foundUser.roles.includes("Installer") ? "Installer" : "Job Giver";
      setRoleState(initialRole);
      localStorage.setItem('userRole', initialRole);
    }
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
