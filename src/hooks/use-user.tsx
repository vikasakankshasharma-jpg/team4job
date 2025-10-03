
"use client";

import { User } from "@/lib/types";
import { usePathname, useRouter } from "next/navigation";
import React, { createContext, useContext, useState, useEffect } from "react";
import { collection, query, where, getDocs, doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client-config";
import { PlaceHolderImages } from "@/lib/placeholder-images";


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

const installerPaths = ['/dashboard/my-bids'];
const jobGiverPaths = ['/dashboard/posted-jobs', '/dashboard/post-job'];


export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRoleState] = useState<Role>("Installer");
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const storedUserEmail = localStorage.getItem('loggedInUserEmail');
    if (storedUserEmail) {
        const fetchUser = async () => {
            const usersRef = collection(db, "users");
            const q = query(usersRef, where("email", "==", storedUserEmail.toLowerCase()));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                const userDoc = querySnapshot.docs[0];
                const foundUser = {
                    id: userDoc.id,
                    ...userDoc.data(),
                    memberSince: userDoc.data().memberSince.toDate()
                } as User;
                setUser(foundUser);
                const storedRole = localStorage.getItem('userRole') as Role;
                const isAdminUser = foundUser.roles.includes("Admin");
                setIsAdmin(isAdminUser);
                if (storedRole && foundUser.roles.includes(storedRole)) {
                    setRoleState(storedRole);
                } else {
                    const initialRole = isAdminUser ? "Admin" : foundUser.roles.includes("Installer") ? "Installer" : "Job Giver";
                    setRoleState(initialRole);
                }
            } else {
                logout();
            }
        };
        fetchUser();
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
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", email.toLowerCase()));
    const querySnapshot = await getDocs(q);
    
    let foundUser: User | null = null;
    
    if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        foundUser = { id: userDoc.id, ...userDoc.data(), memberSince: userDoc.data().memberSince.toDate() } as User;
    } else if (signupData) {
      let roles: User['roles'] = [];
      let rolePrefix = '';
      let freeBids = 0;
      let freeJobs = 0;

      switch(signupData.role) {
        case 'Installer':
          roles = ['Installer'];
          rolePrefix = 'INSTALLER';
          freeBids = 10;
          break;
        case 'Job Giver':
          roles = ['Job Giver'];
          rolePrefix = 'JOBGIVER';
          freeJobs = 10;
          break;
        case 'Both (Job Giver & Installer)':
          roles = ['Job Giver', 'Installer'];
          rolePrefix = 'USER';
          freeBids = 10;
          freeJobs = 10;
          break;
      }

      const today = new Date();
      const datePart = today.toISOString().slice(0, 10).replace(/-/g, '');
      const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase();
      const newUserId = `${rolePrefix}-${datePart}-${randomPart}`;
      
      const randomAvatar = PlaceHolderImages[Math.floor(Math.random() * PlaceHolderImages.length)];
      
      const expiryDate = new Date();
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);

      const pincodeMatch = signupData.fullAddress.match(/(\d{6})/);
      const residentialPincode = pincodeMatch ? pincodeMatch[0] : '';
      
      const newUser: User = {
        id: newUserId,
        name: signupData.name,
        email: signupData.email,
        mobile: signupData.mobile,
        pincodes: { residential: residentialPincode },
        roles: roles,
        memberSince: new Date(),
        avatarUrl: randomAvatar.imageUrl,
        realAvatarUrl: signupData.realAvatarUrl,
        freeBids,
        freeJobs,
        creditsExpiry: expiryDate,
        aadharNumber: signupData.aadhar,
        kycAddress: signupData.kycAddress,
      };
      
      const userToSave: any = { ...newUser };
      if (signupData.role === 'Installer' || signupData.role === 'Both (Job Giver & Installer)') {
        userToSave.installerProfile = {
          tier: 'Bronze',
          points: 0,
          skills: [],
          rating: 0,
          reviews: 0,
          verified: true, // Mock as verified
          reputationHistory: [],
        };
      }
      
      await setDoc(doc(db, "users", newUserId), userToSave);
      foundUser = newUser;

    }
    
    if (foundUser) {
        setUser(foundUser);
        localStorage.setItem('loggedInUserEmail', foundUser.email);
        const isAdminUser = foundUser.roles.includes("Admin");
        setIsAdmin(isAdminUser);
        const initialRole = isAdminUser ? "Admin" : foundUser.roles.includes("Installer") ? "Installer" : "Job Giver";
        setRoleState(initialRole);
        localStorage.setItem('userRole', initialRole);
        return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    setIsAdmin(false);
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
    <UserContext.Provider value={{ user, role, isAdmin, setRole, login, logout, setUser }}>
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
