
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

const installerPaths = ['/dashboard/my-bids', '/dashboard/jobs'];
const jobGiverPaths = ['/dashboard/posted-jobs', '/dashboard/post-job'];


export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRoleState] = useState<Role>("Installer");
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Simulate fetching logged in user on mount
    const loggedInUser = users[0];
    if (loggedInUser) {
      setUser(loggedInUser);
      // Set initial role to first available role, prefer Installer
      const initialRole = loggedInUser.roles.includes("Installer") ? "Installer" : "Job Giver";
      setRoleState(initialRole);
    }
  }, []);

  const login = (userId: string) => {
    const foundUser = users.find((u) => u.id === userId);
    if (foundUser) {
      setUser(foundUser);
      const initialRole = foundUser.roles.includes("Installer") ? "Installer" : "Job Giver";
      setRoleState(initialRole);
    }
  };

  const logout = () => {
    setUser(null);
  };

  const setRole = (newRole: Role) => {
    if (user && user.roles.includes(newRole)) {
      setRoleState(newRole);

      // Redirect if the user is on a page not allowed for the new role
      const isInstallerPage = installerPaths.some(p => pathname.startsWith(p));
      const isJobGiverPage = jobGiverPaths.some(p => pathname.startsWith(p));

      if (newRole === 'Job Giver' && isInstallerPage) {
        router.push('/dashboard');
      }
      if (newRole === 'Installer' && isJobGiverPage) {
        router.push('/dashboard');
      }
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
