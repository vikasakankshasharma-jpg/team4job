// domains/auth/auth.types.ts

import { Role } from '@/lib/types';

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface SignupData {
    name: string;
    email: string;
    mobile: string;
    password: string;
    role: Role;
    pincode?: string;
    referralCode?: string;
}

export interface AuthSession {
    uid: string;
    role: Role;
    email: string;
    emailVerified: boolean;
    mobileVerified?: boolean;
}

export interface PasswordResetRequest {
    email: string;
}

export interface EmailVerificationRequest {
    token: string;
}

export interface AuthError {
    code: string;
    message: string;
}
