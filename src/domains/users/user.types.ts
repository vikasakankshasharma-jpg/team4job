// domains/users/user.types.ts

import { Timestamp } from 'firebase/firestore';
import { Role, Address, PortfolioItem } from '@/lib/types';

export interface User {
    id: string;
    name: string;
    email: string;
    mobile: string;
    avatarUrl: string;
    realAvatarUrl?: string;
    isMobileVerified?: boolean;
    isEmailVerified?: boolean;
    role: Role;
    pincodes: {
        residential: string;
        office?: string;
    };
    address: Address;
    status: 'active' | 'suspended' | 'deactivated';
    memberSince: Date | Timestamp;
    rating: number;
    reviewCount: number;
    completedJobs: number;

    // Installer-specific fields
    skills?: string[];
    certifications?: string[];
    experience?: number;
    verificationStatus?: 'Pending' | 'Verified' | 'Rejected';
    portfolio?: PortfolioItem[];

    // List Management
    favoriteInstallerIds?: string[];
    blockedInstallerIds?: string[];

    // Metadata
    createdAt?: Date | Timestamp;
    updatedAt?: Date | Timestamp;
}

export interface UpdateProfileInput {
    name?: string;
    mobile?: string;
    address?: Address;
    pincodes?: {
        residential: string;
        office?: string;
    };
    skills?: string[];
    bio?: string;
}

export interface InstallerFilters {
    skills?: string[];
    minRating?: number;
    verified?: boolean;
    pincode?: string;
}
