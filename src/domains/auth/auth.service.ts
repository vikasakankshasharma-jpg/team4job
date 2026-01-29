// domains/auth/auth.service.ts

import { authRepository } from './auth.repository';
import { SignupData, AuthSession } from './auth.types';
import { getAdminAuth } from '@/infrastructure/firebase/admin';
import { logger } from '@/infrastructure/logger';
import { User, Role } from '@/lib/types';

/**
 * Auth Service - Business logic for authentication
 * Validates data, enforces rules, calls repository
 */
export class AuthService {
    /**
     * Create a new user account
     * Handles both Firebase Auth and Firestore user document
     */
    async signup(data: SignupData): Promise<{ uid: string; user: Partial<User> }> {
        // Validate input
        this.validateSignupData(data);

        try {
            // Check if email already exists
            const emailExists = await authRepository.emailExists(data.email);
            if (emailExists) {
                throw new Error('Email already registered');
            }

            // Create Firebase Auth user
            const auth = getAdminAuth();
            const userRecord = await auth.createUser({
                email: data.email,
                password: data.password,
                displayName: data.name,
            });

            // Prepare user document data
            const userData: Partial<User> = {
                name: data.name,
                email: data.email,
                mobile: data.mobile,
                roles: [data.role as any],
                isEmailVerified: false,
                isMobileVerified: false,
                status: 'active',
                avatarUrl: this.generateAvatarUrl(data.name),
            };

            // Add role-specific fields
            if (data.role === 'Installer') {
                userData.installerProfile = {
                    tier: 'Bronze',
                    points: 0,
                    skills: [],
                    rating: 0,
                    reviews: 0,
                    verified: false,
                    verificationLevel: 'Basic'
                };
            }

            if (data.pincode) {
                userData.pincodes = {
                    residential: data.pincode,
                };
            }

            if (data.referralCode) {
                userData.referredBy = data.referralCode;
            }

            // Create Firestore user document
            await authRepository.createUser(userRecord.uid, userData);

            logger.userActivity(userRecord.uid, 'signup', {
                role: data.role,
                email: data.email,
            });

            return { uid: userRecord.uid, user: userData };
        } catch (error: any) {
            logger.error('Signup failed', error, {
                metadata: { email: data.email, role: data.role },
            });
            throw new Error(error.message || 'Failed to create account');
        }
    }

    /**
     * Get user session data
     */
    async getSession(uid: string): Promise<AuthSession | null> {
        try {
            const user = await authRepository.getUserById(uid);
            if (!user) {
                return null;
            }

            return {
                uid: user.id,
                role: user.roles?.[0] || 'Job Giver',
                email: user.email,
                emailVerified: user.isEmailVerified || false,
                mobileVerified: user.isMobileVerified || false,
            };
        } catch (error) {
            logger.error('Failed to get session', error, { userId: uid });
            return null;
        }
    }

    /**
     * Verify email
     */
    async verifyEmail(uid: string): Promise<void> {
        try {
            await authRepository.updateEmailVerification(uid, true);
            logger.userActivity(uid, 'email_verified');
        } catch (error) {
            logger.error('Email verification failed', error, { userId: uid });
            throw new Error('Failed to verify email');
        }
    }

    /**
     * Send password reset email
     */
    async sendPasswordResetEmail(email: string): Promise<void> {
        try {
            const auth = getAdminAuth();
            const link = await auth.generatePasswordResetLink(email);

            // TODO: Send email via email service
            logger.info('Password reset link generated', { metadata: { email } });

        } catch (error: any) {
            if (error.code === 'auth/user-not-found') {
                // Don't reveal if email exists
                logger.info('Password reset requested for non-existent email', { metadata: { email } });
                return;
            }
            logger.error('Password reset failed', error, { metadata: { email } });
            throw new Error('Failed to send password reset email');
        }
    }

    /**
     * Validate signup data
     */
    private validateSignupData(data: SignupData): void {
        if (!data.name || data.name.trim().length < 2) {
            throw new Error('Name must be at least 2 characters');
        }

        if (!data.email || !this.isValidEmail(data.email)) {
            throw new Error('Invalid email address');
        }

        if (!data.mobile || !this.isValidMobile(data.mobile)) {
            throw new Error('Invalid mobile number');
        }

        if (!data.password || data.password.length < 6) {
            throw new Error('Password must be at least 6 characters');
        }

        if (!['Job Giver', 'Installer'].includes(data.role)) {
            throw new Error('Invalid role');
        }
    }

    private isValidEmail(email: string): boolean {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    private isValidMobile(mobile: string): boolean {
        // Indian mobile number validation (10 digits)
        const mobileRegex = /^[6-9]\d{9}$/;
        return mobileRegex.test(mobile.replace(/\D/g, ''));
    }

    private generateAvatarUrl(name: string): string {
        // Use UI Avatars service
        const initials = name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&size=200`;
    }
}

export const authService = new AuthService();
