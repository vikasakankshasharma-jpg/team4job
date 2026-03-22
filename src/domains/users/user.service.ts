// domains/users/user.service.ts

import { userRepository } from './user.repository';

import { User, UpdateProfileInput, ProfessionalFilters, Role } from '@/lib/types';

export class UserService {
    async getProfile(userId: string): Promise<User> {
        // Add timeout to prevent SSR hangs
        const user = await Promise.race([
            userRepository.fetchById(userId),
            new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Fetch user profile timeout')), 10000))
        ]);

        if (!user) {
            throw new Error('User not found');
        }
        return user;
    }

    async updateProfile(userId: string, updates: UpdateProfileInput): Promise<void> {
        // Validate updates
        if (updates.name && updates.name.trim().length < 2) {
            throw new Error('Name must be at least 2 characters');
        }

        if (updates.mobile && !this.isValidMobile(updates.mobile)) {
            throw new Error('Invalid mobile number');
        }

        await userRepository.update(userId, updates as Partial<User>);

    }

    async verifyProfessional(professionalId: string, adminId: string): Promise<void> {
        const user = await userRepository.fetchById(professionalId);
        if (!user) {
            throw new Error('User not found');
        }

        if (!user.roles?.includes('Professional')) {
            throw new Error('User is not an Professional');
        }

        await userRepository.update(professionalId, {
            professionalProfile: {
                ...user.professionalProfile,
                verified: true,
                verificationLevel: 'Basic',
            } as any,
        });


    }

    async listProfessionals(filters?: ProfessionalFilters): Promise<User[]> {
        return userRepository.queryProfessionals(filters);
    }

    /**
     * List Professionals with pagination support
     * @param limit - Number of Professionals to fetch
     * @param lastMemberSince - Cursor for pagination
     * @param verified - Filter by verified status
     */
    async listProfessionalsWithPagination(limit = 50, lastMemberSince?: Date, verified = true): Promise<User[]> {
        return userRepository.fetchProfessionals(limit, lastMemberSince, verified);
    }

    async getPublicProfiles(userIds: string[]): Promise<Map<string, any>> {
        return userRepository.fetchPublicProfiles(userIds);
    }

    /**
     * Recalculates all user counters by scanning jobs and transactions
     * Use sparingly for reconciliation
     */
    async recalculateUserStats(userId: string): Promise<Record<string, number>> {
        const db = (await import('@/infrastructure/firebase/admin')).getAdminDb();

        // 1. Count Jobs (Active, Completed, Won)
        const jobsSnap = await db.collection('jobs')
            .where('clientId', '==', userId)
            .get();

        const awardedSnap = await db.collection('jobs')
            .where('awardedProfessionalId', '==', userId)
            .get();

        const stats = {
            activeJobs: 0,
            completedJobs: 0,
            jobsWon: 0,
            totalBids: 0,
            myBids: 0,
            totalEarnings: 0
        };

        // Client logic
        jobsSnap.docs.forEach(doc => {
            const status = doc.data().status;
            if (['open', 'in_progress', 'funded', 'work_submitted'].includes(status.toLowerCase())) {
                stats.activeJobs++;
            } else if (status.toLowerCase() === 'completed') {
                stats.completedJobs++;
            }
        });

        // Professional logic
        awardedSnap.docs.forEach(doc => {
            const status = doc.data().status;
            stats.jobsWon++;
            if (['in_progress', 'funded', 'work_submitted'].includes(status.toLowerCase())) {
                stats.activeJobs++;
            } else if (status.toLowerCase() === 'completed') {
                stats.completedJobs++;
                // Sum earnings
                const bids = doc.data().bids || [];
                const myBid = bids.find((b: any) => (b.professionalId === userId || b.professional === userId));
                if (myBid) stats.totalEarnings += (myBid.amount || 0);
            }
        });

        // 2. Count Bids
        const bidsSnap = await db.collectionGroup('bids')
            .where('professionalId', '==', userId)
            .get();
        stats.myBids = bidsSnap.size;

        // 3. Update Repository
        await userRepository.update(userId, stats as any);


        return stats;
    }

    private isValidMobile(mobile: string): boolean {
        const mobileRegex = /^[6-9]\d{9}$/;
        return mobileRegex.test(mobile.replace(/\D/g, ''));
    }
}

export const userService = new UserService();
