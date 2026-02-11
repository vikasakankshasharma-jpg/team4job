// domains/users/user.repository.ts

import { getAdminDb } from '@/infrastructure/firebase/admin';
import { COLLECTIONS } from '@/infrastructure/firebase/firestore';
import { logger } from '@/infrastructure/logger';
import { User, InstallerFilters } from './user.types';
import { Timestamp } from 'firebase-admin/firestore';

export class UserRepository {
    async fetchById(userId: string): Promise<User | null> {
        try {
            const db = getAdminDb();
            const doc = await db.collection(COLLECTIONS.USERS).doc(userId).get();

            if (!doc.exists) {
                return null;
            }

            return { id: doc.id, ...doc.data() } as User;
        } catch (error) {
            logger.error('Failed to fetch user', error, { userId });
            throw error;
        }
    }

    async update(userId: string, updates: Partial<User>): Promise<void> {
        try {
            const db = getAdminDb();
            await db.collection(COLLECTIONS.USERS).doc(userId).update({
                ...updates,
                updatedAt: Timestamp.now(),
            });

            logger.info('User updated', { userId, fields: Object.keys(updates) });
        } catch (error) {
            logger.error('Failed to update user', error, { userId });
            throw error;
        }
    }

    async queryInstallers(filters?: InstallerFilters, limit = 50): Promise<User[]> {
        try {
            const db = getAdminDb();
            let query = db
                .collection(COLLECTIONS.USERS)
                .where('role', '==', 'Installer');

            if (filters?.verified) {
                query = query.where('verificationStatus', '==', 'Verified');
            }

            if (filters?.pincode) {
                query = query.where('pincodes.residential', '==', filters.pincode);
            }

            if (filters?.minRating) {
                query = query.where('rating', '>=', filters.minRating);
            }

            const snapshot = await query.limit(limit).get();
            const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));

            // Client-side filter for skills (array-contains doesn't work with multiple values)
            if (filters?.skills && filters.skills.length > 0) {
                return users.filter(user =>
                    filters.skills!.some(skill => user.skills?.includes(skill))
                );
            }

            return users;
        } catch (error) {
            logger.error('Failed to query installers', error);
            throw error;
        }
    }

    /**
     * Fetch installers with pagination support (for public_profiles collection)
     * @param limit - Number of installers to fetch
     * @param lastMemberSince - Cursor for pagination (memberSince timestamp of last item)
     * @param verified - Filter by verified status
     */
    async fetchInstallers(limit = 50, lastMemberSince?: Date, verified = true): Promise<User[]> {
        try {
            const db = getAdminDb();
            let query = db
                .collection(COLLECTIONS.PUBLIC_PROFILES)
                .where('roles', 'array-contains', 'Installer');

            if (verified) {
                query = query.where('installerProfile.verified', '==', true);
            }

            query = query.orderBy('memberSince', 'desc');

            if (lastMemberSince) {
                query = query.startAfter(Timestamp.fromDate(lastMemberSince));
            }

            const snapshot = await query.limit(limit).get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
        } catch (error) {
            logger.error('Failed to fetch installers', error, { limit, lastMemberSince });
            throw error;
        }
    }

    /**
     * Fetch public profiles for a list of user IDs
     */
    async fetchPublicProfiles(userIds: string[]): Promise<Map<string, any>> {
        try {
            const db = getAdminDb();
            const usersMap = new Map();
            if (userIds.length === 0) return usersMap;

            // Firestore 'in' query limited to 10-30 items depending on SDK, but 10 is safest old limit.
            // Modern Admin SDK handles more, but chunking is safer.
            for (let i = 0; i < userIds.length; i += 10) {
                const chunk = userIds.slice(i, i + 10);
                const snapshot = await db
                    .collection(COLLECTIONS.PUBLIC_PROFILES)
                    .where('__name__', 'in', chunk)
                    .get();

                snapshot.docs.forEach(doc => {
                    usersMap.set(doc.id, { id: doc.id, ...doc.data() });
                });
            }
            return usersMap;
        } catch (error) {
            logger.error('Failed to fetch public profiles', error, { userIds });
            throw error;
        }
    }
}

export const userRepository = new UserRepository();
