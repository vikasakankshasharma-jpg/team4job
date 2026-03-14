// domains/users/user.service.ts

import { userRepository } from './user.repository';

import { User, UpdateProfileInput, InstallerFilters, Role } from '@/lib/types';

export class UserService {
    async getProfile(userId: string): Promise<User> {
        const user = await userRepository.fetchById(userId);
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

    async verifyInstaller(installerId: string, adminId: string): Promise<void> {
        const user = await userRepository.fetchById(installerId);
        if (!user) {
            throw new Error('User not found');
        }

        if (!user.roles?.includes('Installer')) {
            throw new Error('User is not an installer');
        }

        await userRepository.update(installerId, {
            installerProfile: {
                ...user.installerProfile,
                verified: true,
                verificationLevel: 'Basic',
            } as any,
        });


    }

    async listInstallers(filters?: InstallerFilters): Promise<User[]> {
        return userRepository.queryInstallers(filters);
    }

    /**
     * List installers with pagination support
     * @param limit - Number of installers to fetch
     * @param lastMemberSince - Cursor for pagination
     * @param verified - Filter by verified status
     */
    async listInstallersWithPagination(limit = 50, lastMemberSince?: Date, verified = true): Promise<User[]> {
        return userRepository.fetchInstallers(limit, lastMemberSince, verified);
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
            .where('jobGiverId', '==', userId)
            .get();

        const awardedSnap = await db.collection('jobs')
            .where('awardedInstallerId', '==', userId)
            .get();

        const stats = {
            activeJobs: 0,
            completedJobs: 0,
            jobsWon: 0,
            totalBids: 0,
            myBids: 0,
            totalEarnings: 0
        };

        // Job Giver logic
        jobsSnap.docs.forEach(doc => {
            const status = doc.data().status;
            if (['open', 'in_progress', 'funded', 'work_submitted'].includes(status.toLowerCase())) {
                stats.activeJobs++;
            } else if (status.toLowerCase() === 'completed') {
                stats.completedJobs++;
            }
        });

        // Installer logic
        awardedSnap.docs.forEach(doc => {
            const status = doc.data().status;
            stats.jobsWon++;
            if (['in_progress', 'funded', 'work_submitted'].includes(status.toLowerCase())) {
                stats.activeJobs++;
            } else if (status.toLowerCase() === 'completed') {
                stats.completedJobs++;
                // Sum earnings
                const bids = doc.data().bids || [];
                const myBid = bids.find((b: any) => (b.installerId === userId || b.installer === userId));
                if (myBid) stats.totalEarnings += (myBid.amount || 0);
            }
        });

        // 2. Count Bids
        const bidsSnap = await db.collectionGroup('bids')
            .where('installerId', '==', userId)
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
