// domains/users/user.repository.ts

import { getAdminDb } from '@/infrastructure/firebase/admin';
import { COLLECTIONS } from '@/infrastructure/firebase/firestore';

import { User, ProfessionalFilters } from '@/lib/types';
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


        } catch (error) {

            throw error;
        }
    }

    /**
     * Increment or decrement numeric stats on a user document
     */
    async incrementStats(userId: string, stats: Record<string, number>): Promise<void> {
        try {
            const db = getAdminDb();
            const { FieldValue } = await import('firebase-admin/firestore');

            const updates: Record<string, any> = {
                updatedAt: Timestamp.now()
            };

            for (const [key, value] of Object.entries(stats)) {
                updates[key] = FieldValue.increment(value);
            }

            await db.collection(COLLECTIONS.USERS).doc(userId).update(updates);

        } catch (error) {

            throw error;
        }
    }

    async queryProfessionals(filters?: ProfessionalFilters, limit = 50): Promise<User[]> {
        try {
            const db = getAdminDb();
            let query = db
                .collection(COLLECTIONS.USERS)
                .where('roles', 'array-contains', 'Professional');

            if (filters?.verified) {
                query = query.where('professionalProfile.verified', '==', true);
            }

            if (filters?.pincode) {
                query = query.where('pincodes.residential', '==', filters.pincode);
            }

            if (filters?.minRating) {
                query = query.where('professionalProfile.rating', '>=', filters.minRating);
            }

            // Apply visibility boost (Tier Priority)
            query = query.orderBy('professionalProfile.tierPriority', 'desc');
            query = query.orderBy('professionalProfile.rating', 'desc');

            const snapshot = await query.limit(limit).get();
            const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));

            // Client-side filter for skills (array-contains doesn't work with multiple values)
            if (filters?.skills && filters.skills.length > 0) {
                return users.filter(user =>
                    filters.skills!.some(skill => user.professionalProfile?.skills?.includes(skill))
                );
            }

            return users;
        } catch (error) {

            throw error;
        }
    }

    /**
     * Fetch Professionals with pagination support (for public_profiles collection)
     * @param limit - Number of Professionals to fetch
     * @param lastMemberSince - Cursor for pagination (memberSince timestamp of last item)
     * @param verified - Filter by verified status
     */
    async fetchProfessionals(limit = 50, lastMemberSince?: Date, verified = true): Promise<User[]> {
        try {
            const db = getAdminDb();
            let query = db
                .collection(COLLECTIONS.PUBLIC_PROFILES)
                .where('roles', 'array-contains', 'Professional');

            if (verified) {
                query = query.where('professionalProfile.verified', '==', true);
            }

            // Apply Visibility Boost first, then memberSince
            query = query.orderBy('professionalProfile.tierPriority', 'desc');
            query = query.orderBy('memberSince', 'desc');

            if (lastMemberSince) {
                query = query.startAfter(Timestamp.fromDate(lastMemberSince));
            }

            const snapshot = await query.limit(limit).get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
        } catch (error) {

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

            throw error;
        }
    }
    async evaluateBadges(userId: string): Promise<void> {
        try {
            const db = getAdminDb();
            const userDoc = await db.collection(COLLECTIONS.USERS).doc(userId).get();
            if (!userDoc.exists) return;
            const user = userDoc.data() as User;
            
            const badges: string[] = user.professionalProfile?.badges || [];
            let updated = false;

            const completedJobs = (user as any).completedJobs || 0;
            const rating = user.professionalProfile?.rating || 0;

            if (completedJobs >= 10 && !badges.includes("EXPERIENCED")) {
                badges.push("EXPERIENCED");
                updated = true;
            }
            if (completedJobs >= 50 && !badges.includes("VETERAN")) {
                badges.push("VETERAN");
                updated = true;
            }
            if (completedJobs >= 5 && rating >= 4.8 && !badges.includes("TOP_RATED")) {
                badges.push("TOP_RATED");
                updated = true;
            }

            if (updated) {
                await db.collection(COLLECTIONS.USERS).doc(userId).update({
                    'professionalProfile.badges': badges
                });
            }
        } catch (error) {
            console.error("Failed to evaluate badges", error);
        }
    }
}
export const userRepository = new UserRepository();

