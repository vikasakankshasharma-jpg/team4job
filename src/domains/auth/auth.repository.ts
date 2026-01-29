// domains/auth/auth.repository.ts

import { getAdminDb, getAdminAuth } from '@/infrastructure/firebase/admin';
import { COLLECTIONS } from '@/infrastructure/firebase/firestore';
import { logger } from '@/infrastructure/logger';
import { User } from '@/lib/types';

/**
 * Auth Repository - Data access layer for authentication
 * Only handles Firestore reads/writes, no business logic
 */
export class AuthRepository {
    /**
     * Create a new user document in Firestore
     */
    async createUser(uid: string, data: Partial<User>): Promise<void> {
        try {
            const db = getAdminDb();
            await db.collection(COLLECTIONS.USERS).doc(uid).set({
                ...data,
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            logger.info('User created in Firestore', { userId: uid });
        } catch (error) {
            logger.error('Failed to create user in Firestore', error, { userId: uid });
            throw error;
        }
    }

    /**
     * Get user by email
     */
    async getUserByEmail(email: string): Promise<User | null> {
        try {
            const db = getAdminDb();
            const snapshot = await db
                .collection(COLLECTIONS.USERS)
                .where('email', '==', email)
                .limit(1)
                .get();

            if (snapshot.empty) {
                return null;
            }

            const doc = snapshot.docs[0];
            return { id: doc.id, ...doc.data() } as User;
        } catch (error) {
            logger.error('Failed to get user by email', error, { metadata: { email } });
            throw error;
        }
    }

    /**
     * Get user by ID
     */
    async getUserById(uid: string): Promise<User | null> {
        try {
            const db = getAdminDb();
            const doc = await db.collection(COLLECTIONS.USERS).doc(uid).get();

            if (!doc.exists) {
                return null;
            }

            return { id: doc.id, ...doc.data() } as User;
        } catch (error) {
            logger.error('Failed to get user by ID', error, { userId: uid });
            throw error;
        }
    }

    /**
     * Update email verification status
     */
    async updateEmailVerification(uid: string, verified: boolean): Promise<void> {
        try {
            const db = getAdminDb();
            await db.collection(COLLECTIONS.USERS).doc(uid).update({
                isEmailVerified: verified,
                updatedAt: new Date(),
            });

            logger.info('Email verification updated', { userId: uid, verified });
        } catch (error) {
            logger.error('Failed to update email verification', error, { userId: uid });
            throw error;
        }
    }

    /**
     * Update mobile verification status
     */
    async updateMobileVerification(uid: string, verified: boolean): Promise<void> {
        try {
            const db = getAdminDb();
            await db.collection(COLLECTIONS.USERS).doc(uid).update({
                isMobileVerified: verified,
                updatedAt: new Date(),
            });

            logger.info('Mobile verification updated', { userId: uid, verified });
        } catch (error) {
            logger.error('Failed to update mobile verification', error, { userId: uid });
            throw error;
        }
    }

    /**
     * Check if email exists in Auth
     */
    async emailExists(email: string): Promise<boolean> {
        try {
            const auth = getAdminAuth();
            await auth.getUserByEmail(email);
            return true;
        } catch (error: any) {
            if (error.code === 'auth/user-not-found') {
                return false;
            }
            throw error;
        }
    }
}

export const authRepository = new AuthRepository();
