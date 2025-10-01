
"use client";

import { User } from "@/lib/types";
import { usePathname, useRouter } from "next/navigation";
import React, { createContext, useContext, useState, useEffect } from "react";
import { users as mockUsers } from "@/lib/data";
import { PlaceHolderImages } from "@/lib/placeholder-images";


type Role = "Job Giver" | "Installer" | "Admin";

type UserContextType = {
  user: User | null;
  role: Role;
  setUser: React.Dispatch<React.SetStateAction<User | null>> | null;
  setRole: (role: Role) => void;
  login: (email: string, signupData?: any) => Promise<boolean>;
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
    const storedUserEmail = localStorage.getItem('loggedInUserEmail');
    if (storedUserEmail) {
        const foundUser = mockUsers.find(u => u.email.toLowerCase() === storedUserEmail.toLowerCase());
        if (foundUser) {
            setUser(foundUser);
            const storedRole = localStorage.getItem('userRole') as Role;
            if (storedRole && foundUser.roles.includes(storedRole)) {
                setRoleState(storedRole);
            } else {
                const initialRole = foundUser.roles.includes("Admin") ? "Admin" : foundUser.roles.includes("Installer") ? "Installer" : "Job Giver";
                setRoleState(initialRole);
            }
        } else {
            logout();
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


  const login = async (email: string, signupData: any = null) => {
    let foundUser = mockUsers.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!foundUser && signupData) {
      // Create a new user (mock)
      const newUserId = `user-${Date.now()}`;
      let newAnonymousId = '';
      let roles: User['roles'] = [];

      switch(signupData.role) {
        case 'Installer':
          newAnonymousId = `Installer-${Math.floor(1000 + Math.random() * 9000)}`;
          roles = ['Installer'];
          break;
        case 'Job Giver':
          newAnonymousId = `JobGiver-${Math.floor(1000 + Math.random() * 9000)}`;
          roles = ['Job Giver'];
          break;
        case 'Both (Job Giver & Installer)':
          newAnonymousId = `User-${Math.floor(1000 + Math.random() * 9000)}`;
          roles = ['Job Giver', 'Installer'];
          break;
      }
      
      const randomAvatar = PlaceHolderImages[Math.floor(Math.random() * PlaceHolderImages.length)];

      const newUser: User = {
        id: newUserId,
        name: signupData.name,
        email: signupData.email,
        mobile: signupData.mobile,
        anonymousId: newAnonymousId,
        pincodes: { residential: signupData.pincode || '' },
        roles: roles,
        memberSince: new Date(),
        avatarUrl: randomAvatar.imageUrl,
        realAvatarUrl: `https://picsum.photos/seed/${signupData.name.split(' ')[0]}/100/100`,
      };

      if (signupData.role === 'Installer' || signupData.role === 'Both (Job Giver & Installer)') {
        newUser.installerProfile = {
          tier: 'Bronze',
          points: 0,
          skills: [],
          rating: 0,
          reviews: 0,
          verified: true, // Mock as verified
          reputationHistory: [],
        };
      }
      mockUsers.push(newUser);
      foundUser = newUser;
    }
    
    if (foundUser) {
        setUser(foundUser);
        localStorage.setItem('loggedInUserEmail', foundUser.email);
        const initialRole = foundUser.roles.includes("Admin") ? "Admin" : foundUser.roles.includes("Installer") ? "Installer" : "Job Giver";
        setRoleState(initialRole);
        localStorage.setItem('userRole', initialRole);
        return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('loggedInUserEmail');
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
